const axios = require('axios');
const yaml = require('js-yaml');
const path = require('path');
const lodash = require('lodash');
const fs = require('fs-extra');
const { ConfHelper } = require('../../utils/ConfHelper');
const unzip = require('../../utils/doUnzip');
const zip = require('../../utils/zip');

// CI产生的项目描述文件
const metaFileName = 'ci-meta.json';
// 不参与环境变量替换的文件表
const blackFileNameList = [metaFileName];
// 参与环境变量替换的文件后缀
// TODO 提供对外参数进行传递
const whiteFileSuffixList = ['js', 'css', 'map', 'html', 'json'];

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
  // 取得环境变量的所有配置Key
  const confKeys = getObjectKeys(envConf);
  // 主替换循环
  for (const fileItem of fileList) {
    let fileContent = await fs.readFile(fileItem, 'utf8');
    // 替换所有的环境变量占位符
    confKeys.forEach(confKey => {
      fileContent = fileContent.replaceAll(getKeyPlaceHolders(confKey), envConf[confKey]);
    });

    // 将替换后的文件内容写出
    await fs.writeFile(fileItem, fileContent);

    // 判断当前文件名是否存在hash特征，如果存在，则计入文件更新表中
    // 开启递归式的Hash更新
  }
}

async function deploy() {
  fs.removeSync(path.resolve(process.cwd(), 'temp'));
  fs.mkdirSync(path.resolve(process.cwd(), 'temp'));

  await unzip(
    path.resolve(process.cwd(), 'online-assessment-app.zip'),
    path.resolve(process.cwd(), 'temp')
  );

  process.chdir(path.resolve(process.cwd(), 'temp'));

  // 获取项目根目录
  const projectRoot = process.cwd();
  const metaFilePath = path.resolve(projectRoot, metaFileName);

  // 获取当前项目的编译Meta信息
  const projectMeta = require(metaFilePath);

  // 获取目标环境配置信息
  const { data: confStr } = await axios.get(
    'http://192.168.2.10:9110/test1(_)zcj/front_onlineassessment-1.yml'
  );
  const conf = yaml.load(confStr, 'utf8');

  // 取得环境变量过滤模式，只应用部分有用的环境变量，过滤掉其他不需要的环境变量
  const envFilterPattern = new RegExp(projectMeta.envMap.GMSOFT_ENV_FILTER);
  const whiteKeys = Object.keys(conf).filter(key => envFilterPattern.test(key));
  const validConf = lodash.pick(conf, whiteKeys);

  // 将环境变量降维展开成一维结构
  let envConf = ConfHelper.convertConfToEnvironment(validConf);

  // 构建文件表：获取目录下所有文件的路径，排除某些CI本身产生的描述文件及特殊文件，排除不参与环境变量替换的文件类型
  let allFileList = await getAllFileList(projectRoot);
  allFileList = allFileList.filter(i => !inBlackList(i) && inWhiteList(i));

  // 搜索并递归执行替换，最大执行深度：10，超过此深度，认定为错误源程序，模块间可能存在循环引用问题，需处理后重新打包编译，再执行部署
  await replaceEnv(envConf, allFileList);

  process.chdir(path.resolve(process.cwd(), '..'));

  fs.removeSync(path.resolve(process.cwd(), 'temp.zip'));

  await zip(path.resolve(process.cwd(), 'temp'), path.resolve(process.cwd()));
}

module.exports = deploy;
