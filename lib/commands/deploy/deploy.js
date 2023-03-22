const path = require('path');
const lodash = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const child_process = require('child_process');
const { cloneDeep, isEmpty } = require('lodash');
const { ConfHelper } = require('../../utils/ConfHelper');
const doZip = require('../../utils/doZip');
const { DeployHelper } = require('../../utils/DeployHelper');
const { NpmHelper } = require('../../utils/NpmHelper');
const { doUpload } = require('./doUpload');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');
const { FileHelper } = require('../../utils/FileHelper');

// CI产生的项目描述文件
const metaFileName = 'package.json';
// 不参与环境变量替换的文件表
const blackFileNameList = [metaFileName];
// 参与环境变量替换的文件后缀
// TODO 提供对外参数进行传递
const whiteFileSuffixList = ['js', 'css', 'map', 'html', 'json', 'tpl'];
// 文件是否参与Hash重算的判断模式，如果判定成功，则界定为改文件使用了Hash文件名，需要进行Hash重算，否则不需要应用Hash重算逻辑，保持原文件名即可
const isHashFileNamePattern = /(?<=\.)(?:[\da-f]{6,})(?=\.)/i;

function inBlackList(filePath) {
  for (const blackName of blackFileNameList) {
    if (filePath.endsWith(blackName)) {
      return true;
    }
  }
  return false;
}

function inWhiteList(filePath) {
  for (const whiteFileSuffix of whiteFileSuffixList) {
    if (filePath.endsWith(whiteFileSuffix)) {
      return true;
    }
  }
  return false;
}

async function getAllFileList(projectRoot) {
  const fileList = [];
  const list = await fs.readdir(projectRoot);

  for (const fileItem of list) {
    const currentItemPath = path.resolve(projectRoot, fileItem);
    const stat = await fs.stat(currentItemPath);
    if (stat.isFile()) {
      fileList.push(currentItemPath);
      continue;
    }
    if (stat.isDirectory()) {
      fileList.push(...(await getAllFileList(path.resolve(projectRoot, fileItem))));
    }
  }

  return fileList;
}

const ENV_SUFFIX = '.ci_env_suffix';

const getObjectKeys = lodash.memoize(obj => Object.keys(obj));

const getKeyPlaceHolders = lodash.memoize(key => `${key}${ENV_SUFFIX}`);

async function replaceEnv(envConf, fileList) {
  // 记录被修改过的文件，用于后续的Hash重算
  const modifyFiles = new Set();

  // 取得环境变量的所有配置Key
  const confKeys = getObjectKeys(envConf);
  // 主替换循环
  for (const fileItem of fileList) {
    let fileContent = await fs.readFile(fileItem, 'utf8');

    // 标记当前文件是否被修改
    let dirtyFile = false;

    // 替换所有的环境变量占位符
    confKeys.forEach(confKey => {
      // 如果文件中存在环境变量标识符，则进行替换，并记录被修改过的文件
      if (fileContent.includes(getKeyPlaceHolders(confKey))) {
        dirtyFile = true;
        fileContent = fileContent.replaceAll(getKeyPlaceHolders(confKey), envConf[confKey]);

        // 如果符合文件Hash命名规则，则计入Hash重算待办集合，后续参与Hash重算
        if (isHashFileNamePattern.test(fileItem)) {
          modifyFiles.add(fileItem);
        }
      }
    });

    // 如果文件被修改过，则进行写出
    if (dirtyFile) {
      // 将替换后的文件内容写出
      await fs.writeFile(fileItem, fileContent);
    }
  }

  return modifyFiles;
}

async function recalculateHash(allFiles, modifyFiles, depth = 0) {
  const currentAllFile = cloneDeep(allFiles);
  const currentModifyFiles = Array.from(modifyFiles);

  if (isEmpty(currentModifyFiles)) {
    return;
  }

  if (depth >= 10) {
    ErrorHelper.throwError(ErrorCode.ERROR_RECALCULATE_HASH_DEPTH_OVERFLOW);
  }

  const nextModifyFiles = new Set();

  for (const modifyFilePath of currentModifyFiles) {
    // 计算出文件的新Hash路径
    const fileNewMD5 = FileHelper.calculateFileMD5(modifyFilePath);

    const newHashFilePath = modifyFilePath.replace(isHashFileNamePattern, fileNewMD5.substr(-8));

    // 遍历文件列表，寻找所有包含此文件引用的文件，更新他们的引用路径
    for (const testFilePath of currentAllFile) {
      // 当前文件，自引用，跳过
      if (modifyFilePath === testFilePath) {
        continue;
      }

      // 待确认文件内容
      let fileContent = await fs.readFile(testFilePath, 'utf8');
      // 造成文件影响的原始文件名
      const effectFileName = path.basename(modifyFilePath);

      // 如果目标文件存在文件名，则更新，并记录此次文件更新，用于下一轮迭代
      if (fileContent.includes(effectFileName)) {
        fileContent = fileContent.replaceAll(effectFileName, path.basename(newHashFilePath));
        await fs.writeFile(testFilePath, fileContent, 'utf8');
        // 如果修改的文件名符合Hash重算规则，且不是sourceMap文件，则加入下一轮Hash重算任务
        if (isHashFileNamePattern.test(testFilePath) && !testFilePath.endsWith('.map')) {
          nextModifyFiles.add(testFilePath);
        }
      }

      // 针对Webpack模块加载系统的Hash更新逻辑
      // 匹配样例：2:"b0d52471"
      // 匹配模式：/(?<=\d:")[\da-f]{6,}(?=")/i
      const hashPattern = /(?<=\d\.)([\da-f]{6,})(?=\.chunk.js)/i;
      const oldFileHash = path.basename(effectFileName).match(hashPattern);
      const newFileHash = path.basename(newHashFilePath).match(hashPattern);
      const webpackHashPattern = new RegExp(`(?<=\\d:")${oldFileHash}(?=")`, 'ig');
      // 如果目标文件存在Webpack模块加载系统的Hash，则更新，并记录此次文件更新，用于下一轮迭代
      if (
        oldFileHash &&
        newFileHash &&
        webpackHashPattern.test(fileContent) &&
        fileContent.includes(oldFileHash[0])
      ) {
        // 替换文件Hash
        fileContent = fileContent.replace(webpackHashPattern, newFileHash[0]);
        await fs.writeFile(testFilePath, fileContent, 'utf8');
        // 如果修改的文件名符合Hash重算规则，且不是sourceMap文件，则加入下一轮Hash重算任务
        if (isHashFileNamePattern.test(testFilePath) && !testFilePath.endsWith('.map')) {
          nextModifyFiles.add(testFilePath);
        }
      }
    }

    if (modifyFilePath !== newHashFilePath) {
      // 更新全局文件表中对应的条目，用于后续任务迭代（执行过程中有可能会重命名表中的数据，需要实时更新）
      const targetIndex = currentAllFile.findIndex(i => i === modifyFilePath);
      currentAllFile[targetIndex] = newHashFilePath;
      // 更新任务表中对应的条目，用于后续任务迭代（执行过程中有可能会重命名表中的数据，需要实时更新）
      const targetModifyIndex = currentModifyFiles.findIndex(i => i === modifyFilePath);
      currentModifyFiles[targetModifyIndex] = newHashFilePath;
      // 下一轮任务中的文件名也要同步更新
      if (nextModifyFiles.has(modifyFilePath)) {
        nextModifyFiles.delete(modifyFilePath);
        nextModifyFiles.add(newHashFilePath);
      }

      // 造成影响的文件重命名，指定新的Hash
      await fs.rename(modifyFilePath, newHashFilePath);
    }
  }

  return await recalculateHash(currentAllFile, nextModifyFiles, depth + 1);
}

async function deploy({ projectName, env, room, opts, workDir }) {
  const projectRoot = path.join(workDir, 'node_modules', projectName);

  // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
  const baseConf = await ConfHelper.getBaseConfig();

  console.log('[2/6] 拉取成品库文件...');
  const npmHelper = new NpmHelper(baseConf.npm.user, baseConf.npm.passwd);
  // 安装成品文件，如果指定的了版本则使用指定的版本
  const installShell = opts.target
    ? `npm --registry ${npmHelper.REGISTRY_PRODUCT} install ${projectName}@${opts.target}`
    : `npm --registry ${npmHelper.REGISTRY_PRODUCT} install ${projectName}`;

  try {
    child_process.execSync(installShell, {
      stdio: 'ignore',
    });
  } catch (error) {
    ErrorHelper.throwError(ErrorCode.ERROR_NPM_INSTALL_ERROR, error.message);
  }

  // 项目描述文件地址
  const metaFilePath = path.resolve(projectRoot, metaFileName);

  // 目标环境配置地址
  const confUrl = ConfHelper.getConfigUrl(projectRoot, env, room, opts.conf, opts.confLabel);
  console.log('[3/6] 获取目标环境配置信息...');
  // 获取目标环境配置信息
  const conf = await ConfHelper.getYmlConfig(confUrl);

  // 获取当前项目的编译Meta信息
  const projectMeta = require(metaFilePath);

  // 取得环境变量过滤模式，只应用部分有用的环境变量，过滤掉其他不需要的环境变量
  const envFilterPattern = new RegExp(projectMeta.envMap.GMSOFT_ENV_FILTER);
  const whiteKeys = Object.keys(conf).filter(key => envFilterPattern.test(key));
  const validConf = lodash.pick(conf, whiteKeys);

  if (!validConf[ConfHelper.CONF_DEFAULT_FIELD_NAME]) {
    console.log(
      chalk.yellow(
        '[WARN] 当前配置文件内没有发现business配置段，您发布的目标机房或机房似乎不存在正确的配置文件，或配置文件有误，部署将继续执行，但您得到的部署结果，大概率是错误的，请注意！'
      )
    );
  }

  // 将环境变量降维展开成一维结构
  let envConf = ConfHelper.convertConfToEnvironment(validConf);

  console.log(chalk.magenta('=========================== 环境变量 ==========================='));
  console.log(envConf);

  console.log('[4/6] 开始构建目标文件...');
  // 构建文件表：获取目录下所有文件的路径，排除某些CI本身产生的描述文件及特殊文件，排除不参与环境变量替换的文件类型
  const allFileList = await getAllFileList(projectRoot);
  const dealWidthFileList = allFileList.filter(i => !inBlackList(i) && inWhiteList(i));

  // 搜索并执行替换
  const modifyFileList = await replaceEnv(envConf, dealWidthFileList);

  // 对修改的文件进行递归Hash重算，最大执行深度：10，超过此深度，认定为错误源程序，模块间可能存在循环引用问题，需处理后重新打包编译，再执行部署
  // await recalculateHash(allFileList, modifyFileList);

  // TODO 属性结构Hash重算（针对大型项目的优化）
  // await recalculateHashUseTree(allFileList, modifyFileList);

  // 如果是生产环境，删除sourceMap文件
  if (env === 'pro') {
    FileHelper.deleteSourceMap(projectRoot);
  }

  console.log('[5/6] 开始打包/上传...');
  if (opts.dest) {
    await doZip(
      projectRoot,
      typeof opts.dest === 'string' ? opts.dest : DeployHelper.DEFAULT_LOCAL_DEST_DIR,
      projectName
    );
  } else {
    // 根据环境配置进行直接部署
    await doUpload({
      targetConf: conf,
      env,
      room,
      deployType: projectMeta.type,
      buildDir: projectRoot,
    });
  }
}

module.exports = deploy;
