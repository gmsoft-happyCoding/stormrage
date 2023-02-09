/**
 * 使用说明：
 * 1. 将该文件放置在项目根目录下
 * 2. 脚本将帮助您快速替换项目内的环境变量引用，例如：${interface_xcj} => ${business.interface_xcj}
 * 3. 如果想要使用脚本进行环境变量快速替换，请将项目的环境变量均定义在business段下，包括网关，domain等等的
 * 4. 执行 node ./env-replace.js
 *
 * 风险：
 * 该脚本的替换规则是基于配置的动态正则表达式，并非基于AST，因此可能会存在误替换的风险
 * 使用前请检查您的项目内是否存在如下的情景，如果存在，请不要使用此脚本进行批量替换
 *
 * 危险场景示例：
 *
 * 项目yml配置： business.open_api : 'https://openapi.zcygov.cn'
 * 项目内源码：
 * const open_api = 'xxxx'
 * const url = `${open_api}/xxx`
 *
 * 阐释：
 * 上述场景中，在使用此脚本进行替换时，会将${open_api}替换为${business.open_api}，导致url变量的值变为
 * const url = `${business.open_api}/xxx`
 * 从而导致语法错误，主要原因是基于正则的匹配无法鉴别命中的字符串到底是环境变量引用，还是ES6字符串模板语法
 */

const fs = require('fs');
const path = require('path');

// 通过env子指令获取到的环境变量配置信息
const businessEnv = {
  'business.CDN_SERVER': '//cdn.gm',
  'business.zcy_login_url': 'https://login.zcygov.cn/login',
};

// 需要进行替换的环境变量key，取决于业务代码中使用的环境变量key，如果业务中环境变量全部使用business.开头，则可以直接使用下面的代码
const keys = Object.keys(businessEnv).map(i => i.replace('business.', ''));
// 无需处理的文件夹以及文件
const ignoreDir = ['node_modules', 'modules', 'env-replace.js'];
// 需要处理的源码文件后缀
const targetFileSuffix = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'json',
  'html',
  'css',
  'less',
  'scss',
  'sass',
  'tpl',
  'es',
  'html',
];

const rootDir = process.cwd();
// 要替换的目标串模式，基于配置的动态正则表达式
const regexpStr = `\\$\\{(?!(business|gateway|hosts|pdf-preview).)(${keys.join('|')})\\}`;
const replacePattern = new RegExp(regexpStr, 'g');

// 是否是文件
function isFile(filePath) {
  return fs.statSync(filePath).isFile();
}

// 获取目标目录及子目录下所有文件的绝对路径
function getAllFile(dirPath) {
  const currentPath = process.cwd();
  const allItems = fs.readdirSync(dirPath).filter(i => !ignoreDir.includes(i));
  const validFiles = [];
  const validDirs = [];
  allItems.forEach(item => {
    const itemPath = path.join(currentPath, item);
    if (isFile(itemPath) && targetFileSuffix.includes(item.split('.').pop())) {
      validFiles.push(itemPath);
    }
    if (!isFile(itemPath)) {
      validDirs.push(itemPath);
    }
  });

  // 递归下级目录
  validDirs.forEach(subDir => {
    process.chdir(subDir);
    validFiles.push(...getAllFile(subDir));
    process.chdir(path.join(subDir, '..'));
  });

  return validFiles;
}

function readFileContent(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}
function writeFileContent(filePath, fileContent) {
  fs.chmodSync(filePath, 0o777);
  return fs.writeFileSync(filePath, fileContent, 'utf-8');
}

const allFile = getAllFile(rootDir);

allFile.forEach(filePath => {
  const fileContent = readFileContent(filePath);
  const match = fileContent.match(replacePattern);
  if (match) {
    // 命中规则，进行替换并写出
    const replacedContent = fileContent.replace(replacePattern, '${business.$2}');
    writeFileContent(filePath, replacedContent);
  }
});
