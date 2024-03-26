const path = require('path');
const lodash = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const child_process = require('child_process');
const { copyTargetSh, copyMachineConf, getMachineInfo, writeAppConf } = require('../../deployInfo');
const { ConfHelper } = require('../../utils/ConfHelper');
const doZip = require('../../utils/doZip');
const { DeployHelper } = require('../../utils/DeployHelper');
const { NpmHelper } = require('../../utils/NpmHelper');
const { doUpload } = require('./doUpload');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');
const { FileHelper } = require('../../utils/FileHelper');
const { recalculateHash } = require('./recalculateHash');
const { recalculateHashUseTree } = require('./recalculateHashUseTree');
const { default: errorCode } = require('../../errorCode');
const { RegExpUtils } = require('../../utils/RegexUtils');
const { Base64VLQUtils } = require('../../utils/Base64VLQUtils');

// CI产生的项目描述文件
const metaFileName = 'package.json';
// 不参与环境变量替换的文件表
const blackFileNameList = [metaFileName];
// 参与环境变量替换的文件后缀
// TODO 提供对外参数进行传递
const whiteFileSuffixList = ['.js', '.css', '.html', '.json', '.tpl'];

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

function replaceSourceMap(targetFileContent, mappingIndex, envConf, confKeys) {
  const minKeyLength = Math.min(...confKeys.map(i => getKeyPlaceHolders(i).length));
  let resultContent = targetFileContent;
  const resultMapping = mappingIndex.map(i => [...i]);
  let hasChange = false;
  // 目标文件VLQ游标
  let targetBaseIndex = 0;

  for (let i = 0; i < resultMapping.length; i++) {
    const currentBase = targetBaseIndex + resultMapping[i][0];
    const [start, end] = [
      currentBase,
      resultMapping[i + 1] !== undefined ? currentBase + resultMapping[i + 1][0] : undefined,
    ];

    targetBaseIndex += resultMapping[i][0];
    // 目标代码片段
    const targetCodeFragment = resultContent.slice(start, end);

    // 优化判断1：如果目标片段长度小于最短Key长度，直接跳过
    if (targetCodeFragment.length < minKeyLength) {
      continue;
    }

    const match = targetCodeFragment.match(
      new RegExp(getKeyPlaceHolders(`(${confKeys.map(RegExpUtils.escape).join('|')})`))
    );

    if (!match) {
      // 未命中环境变量占位符，跳过处理
      continue;
    }

    // 进行替换，并修正VLQ游标，记录修改标记
    hasChange = true;

    // 将字符串拆分为三段
    const [before, middle, after] = [
      resultContent.substr(0, start),
      resultContent.substr(start, targetCodeFragment.length),
      resultContent.substr(start + targetCodeFragment.length),
    ];
    // 替换中间段
    const newMiddle = middle.replace(match[0], envConf[match[1]]);
    resultContent = before + newMiddle + after;
    // 计算VLQ差值，修正VLQ游标
    const vlqEffect = newMiddle.length - middle.length;
    if (resultMapping[i + 1] !== undefined) {
      resultMapping[i + 1][0] += vlqEffect;
    }
  }

  return { resultContent, resultMapping, hasChange };
}

function replaceEnvForSourceMap(envConf, confKeys, fileItem, fileContent) {
  const sourceMapInfo = JSON.parse(fs.readFileSync(fileItem + '.map', 'utf8'));
  const targetFileContent = fileContent;

  const mappingIndex = sourceMapInfo.mappings.split(',').map(i => Base64VLQUtils.decodeMappings(i));

  const { resultContent, resultMapping, hasChange } = replaceSourceMap(
    targetFileContent,
    mappingIndex,
    envConf,
    confKeys
  );

  sourceMapInfo.mappings = resultMapping.map(i => Base64VLQUtils.encodeMappings(i)).join(',');
  // 写出SourceMap文件
  fs.writeFileSync(fileItem + '.map', JSON.stringify(sourceMapInfo));
  return [hasChange, resultContent];
}

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

    // 判断当前文件内容是否包含环境变量引用符号，如果没有，则直接跳过
    const allKeyPattern = new RegExp(
      getKeyPlaceHolders(`(${confKeys.map(RegExpUtils.escape).join('|')})`),
      'g'
    );
    if (!allKeyPattern.test(fileContent)) {
      continue;
    }

    let hasSourceMap = FileHelper.isFile(fileItem + '.map');

    // 具备SourceMap的文件，不能直接替换，需要连带SourceMap一同处理，否则会造成SourceMap与源文件不匹配，导致无法调试
    if (hasSourceMap) {
      // 替换所有的环境变量占位符，并更新SourceMap文件
      [dirtyFile, fileContent] = replaceEnvForSourceMap(envConf, confKeys, fileItem, fileContent);
    } else {
      // 不带有SourceMap的文件，直接替换所有的环境变量占位符
      confKeys.forEach(confKey => {
        // 如果文件中存在环境变量标识符，则进行替换，并记录被修改过的文件
        if (fileContent.includes(getKeyPlaceHolders(confKey))) {
          dirtyFile = true;
          const replacePattern = new RegExp(RegExpUtils.escape(getKeyPlaceHolders(confKey)), 'g');
          fileContent = fileContent.replace(replacePattern, envConf[confKey]);
        }
      });
    }

    // 如果文件被修改过，则进行写出，并记录到修改文件集合中
    if (dirtyFile) {
      // 如果符合文件Hash命名规则，则计入Hash重算待办集合，后续参与Hash重算
      if (FileHelper.isHashFileNamePattern.test(fileItem)) {
        modifyFiles.add(fileItem);
      }
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

  if (latestVersion) {
    console.log(chalk.magenta('=========================== 成品版本 ==========================='));
    console.log(latestVersion);
  }

  // 安装成品文件，如果指定的了版本则使用指定的版本
  const installShell = latestVersion
    ? `yarn add ${projectName}@${latestVersion} --registry ${npmHelper.REGISTRY_PRODUCT}`
    : `yarn add ${projectName} --registry ${npmHelper.REGISTRY_PRODUCT}`;

  try {
    child_process.execSync('yarn init -y', {
      stdio: 'ignore',
    });
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

  // 关闭环境变量白名单机制，使用所有环境变量
  const whiteKeys = Object.keys(conf).filter(key => true || envFilterPattern.test(key));
  const validConf = lodash.pick(conf, whiteKeys);

  // 将环境变量降维展开成一维结构
  let envConf = ConfHelper.convertConfToEnvironment(validConf);

  // 读取当前成品库的默认环境变量配置
  const defaultEnvConfURI = path.resolve(projectRoot, ConfHelper.PROJECT_DEFAULT_CONF_FILE);
  const defaultEnvConf = await ConfHelper.getYmlConfig(defaultEnvConfURI);

  envConf = { ...defaultEnvConf, ...envConf };

  // 使用目标环境变量替换当前配置中的占位符
  envConf = ConfHelper.replaceEnvForSelf(envConf);

  // 如果发现没有business配置段，则自动补充一个默认的business配置段，基于当前项目的package.json中的name字段
  if (!envConf[`${ConfHelper.CONF_DEFAULT_FIELD_NAME}.project-name`]) {
    console.log(
      chalk.yellow(
        '[WARN] 当前配置文件内没有发现business配置段，您发布的目标机房或机房似乎不存在正确的配置文件，或配置文件有误，部署将继续执行，但您得到的部署结果，大概率是错误的，请注意！'
      )
    );
    envConf[`${ConfHelper.CONF_DEFAULT_FIELD_NAME}.project-name`] = projectMeta.name;
    envConf[`${ConfHelper.CONF_DEFAULT_FIELD_NAME}.public-url`] = projectMeta.name;
  }

  // 环境变量黑名单过滤，过滤最终环境变量结果，左匹配
  const blackField = opts.blackField ? opts.blackField.split(',') : [];
  const allFieldKeys = Object.keys(envConf);
  const whiteFieldKeys = allFieldKeys.filter(key => !blackField.some(i => key.startsWith(i)));
  envConf = lodash.pick(envConf, whiteFieldKeys);

  if (!lodash.isEmpty(blackField)) {
    console.log(
      chalk.magenta('=========================== 环境变量黑名单 ===========================')
    );
    console.table(blackField);
  }

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
  const publicPath = envConf['business.public-url'];

  let deployTag = envConf['business.deploy-tag'];

  deployTag = deployTag ? deployTag : null;

  if (!deployTag) {
    deployTag =
      projectMeta.type === 'app'
        ? ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_APP
        : ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_COMPONENT;
  }

  console.log('[5/6] 开始打包/上传...');
  if (opts.dest) {
    const destDirRoot =
      typeof opts.dest === 'string' ? opts.dest : DeployHelper.DEFAULT_LOCAL_DEST_DIR;
    // 拷贝目标机器执行脚本
    await copyTargetSh(env, room, destDirRoot);
    // 打包文件
    const fileName = await doZip(projectRoot, path.join(destDirRoot, env, room), projectName);
    // 拷贝发布机房信息
    await generateConf(
      conf,
      deployTag,
      env,
      room,
      publicPath,
      path.join(destDirRoot, env, room),
      fileName
    );
  } else {
    // 根据环境配置进行直接部署
    await doUpload({
      targetConf: conf,
      env,
      room,
      deployTag,
      buildDir: projectRoot,
      publicUrl: publicPath,
    });
  }
}

async function generateConf(allConf, deployTag, env, room, publicPath, pwd, distFileName) {
  let deployConf = allConf[ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_TO];
  if (!deployConf) {
    // 如果目标配置本身没有配置deployConf，说明使用默认配置，从默认配置去获取部署点信息
    const confUrl = await ConfHelper.getConfigUrl(
      null,
      env,
      room,
      ConfHelper.CONF_DEFAULT_DEPLOY_FILENAME
    );
    // 默认发布配置信息
    const allDeployConf = await ConfHelper.getYmlConfig(confUrl);
    deployConf = allDeployConf[ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_TO][deployTag];
  }

  const machineInfoUrl = ConfHelper.getConfigUrl(
    null,
    env,
    room,
    ConfHelper.CONF_DEFAULT_MACHINES_FILENAME
  );
  const allMachineInfo = await ConfHelper.getYmlConfig(machineInfoUrl);
  const machinesInfo = allMachineInfo[ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_MACHINES];

  const deployMachines = [];

  let safePublicPath = publicPath;
  const domainPrefixPattern = /^((https?):)?\/\/[^/]+/;
  const domainPrefix = publicPath.match(domainPrefixPattern);
  if (domainPrefix) {
    safePublicPath = publicPath.replace(domainPrefixPattern, '');
  }

  deployConf.forEach(deployItem => {
    const targetMachine = machinesInfo.find(i => i.name === deployItem.toMachine);
    if (targetMachine) {
      deployMachines.push({
        machine: `machine${targetMachine.id}`,
        where: [
          {
            rootKey: deployItem.toLocation,
            path: safePublicPath,
          },
        ],
      });
    }
  });

  for (const deployMachine of deployMachines) {
    // 拷贝机器信息配置文件
    await copyMachineConf(env, room, deployMachine.machine, pwd);
    const machineInfo = await getMachineInfo(env, room, deployMachine.machine);
    // 写app配置文件
    for (const w of deployMachine.where) {
      if (!w || !w.rootKey) {
        console.error('where 配置错误请检查!');
        return process.exit(errorCode.CONF_ERROR);
      }

      if (!lodash.get(machineInfo, w.rootKey)) {
        console.error(
          `在配置文件 ${env}-${room}-${deployMachine.machine} 中没有找到 ${w.rootKey}, 请检查!`
        );
        return process.exit(errorCode.CONF_ERROR);
      }
      writeAppConf(distFileName, lodash.get(machineInfo, w.rootKey), deployMachine.machine, w, pwd);
    }
  }
}

module.exports = deploy;
