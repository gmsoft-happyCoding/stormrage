const path = require('path');
const lodash = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const child_process = require('child_process');
const { ConfHelper } = require('../../utils/ConfHelper');
const doZip = require('../../utils/doZip');
const { DeployHelper } = require('../../utils/DeployHelper');
const { NpmHelper } = require('../../utils/NpmHelper');
const { doUpload } = require('./doUpload');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');
const { FileHelper } = require('../../utils/FileHelper');
const { recalculateHash } = require('./recalculateHash');
const { recalculateHashUseTree } = require('./recalculateHashUseTree');

// CI产生的项目描述文件
const metaFileName = 'package.json';
// 不参与环境变量替换的文件表
const blackFileNameList = [metaFileName];
// 参与环境变量替换的文件后缀
// TODO 提供对外参数进行传递
const whiteFileSuffixList = ['js', 'css', 'map', 'html', 'json', 'tpl'];

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

const getObjectKeys = lodash.memoize(obj => Object.keys(obj));

const getKeyPlaceHolders = lodash.memoize(key => `${key}${ConfHelper.ENV_SUFFIX}`);

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
        if (FileHelper.isHashFileNamePattern.test(fileItem)) {
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

async function deploy({ projectName, env, room, opts, workDir }) {
  const projectRoot = path.join(workDir, 'node_modules', projectName);

  // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
  const baseConf = await ConfHelper.getBaseConfig();

  console.log('[2/6] 拉取成品库文件...');
  const npmHelper = new NpmHelper(baseConf.npm.user, baseConf.npm.passwd);

  const NPM_AUTH_TOKEN = await npmHelper.getNpmToken();
  // 写出npmrc配置文件
  child_process.execSync(
    `npm config set ${NpmHelper.REGISTRY_PRODUCT.replace('http:', '')}:_authToken=${NPM_AUTH_TOKEN}`
  );
  // 设置携带Token
  child_process.execSync('npm config set always-auth=true');

  let latestVersion = '';

  // 如果指定了明确的发布版本号，直接使用即可
  if (opts.target) {
    latestVersion = opts.target;
  } else if (opts.targetMake) {
    // 如果指定了成品版本，则计算实际的Npm版本
    latestVersion = await npmHelper.getLatestVersion(projectName, opts.targetMake);
  }

  // 安装成品文件，如果指定的了版本则使用指定的版本
  const installShell = latestVersion
    ? `npm --registry ${npmHelper.REGISTRY_PRODUCT} install ${projectName}@${latestVersion}`
    : `npm --registry ${npmHelper.REGISTRY_PRODUCT} install ${projectName}`;

  try {
    child_process.execSync(installShell, {
      stdio: 'ignore',
    });
  } catch (error) {
    ErrorHelper.throwError(ErrorCode.ERROR_DEPLOY_NAME_OR_VERSION_INVALID, error.message);
  }

  // 项目描述文件地址
  const metaFilePath = path.resolve(projectRoot, metaFileName);

  // 目标环境配置地址
  const confUrl = ConfHelper.getConfigUrl(projectRoot, env, room, opts.conf, opts.confLabel);
  console.log('[3/6] 获取目标环境配置信息...');
  // 获取目标环境配置信息
  let conf = null;
  try {
    conf = await ConfHelper.getYmlConfig(confUrl);
  } catch (error) {
    throw ErrorHelper.throwError(ErrorCode.ERROR_PRO_CONFIG_NOT_EXIST);
  }

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
  // 总文件数小于500，采用一般算法进行Hash重算，大于500，则启用树形结构Hash重算
  if (allFileList.length < 500) {
    // 对修改的文件进行递归Hash重算，最大执行深度：10，超过此深度，认定为错误源程序，模块间可能存在循环引用问题，需处理后重新打包编译，再执行部署
    await recalculateHash(allFileList, modifyFileList);
  } else {
    // 树形结构Hash重算（针对大型项目的优化）
    await recalculateHashUseTree(allFileList, modifyFileList, opts.ignoreDir);
  }

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
