// require modules
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const doZip = require('./doZip');
const { isSubProject, isComponentsProject } = require('../project-info/isProject');
const { packageType } = require('../project-info/packageType');
const errorCode = require('../errorCode');

/**
 * 在当前项目根目录生产打包文件
 * @param {string} source - 源
 * @param {string} dest - 保存文件路径
 * @param {string} zipFileNameSubjoin - 生成的包文件附加名称, 用于同一项目通过代码剪裁生成不同结果时能生成不同名称的zip
 */
function zip(source, dest, zipFileNameSubjoin) {
  const projectRoot = process.cwd();

  let suffix = null;
  if (isSubProject(projectRoot)) {
    suffix = isComponentsProject(projectRoot) ? packageType.COMPONENTS : packageType.APP;
  }
  const projectName = path.basename(
    isSubProject(projectRoot) ? path.join(projectRoot, '..', '..') : projectRoot
  );

  // 附加配置传递的项目后缀名称
  const fullProjectName = zipFileNameSubjoin
    ? `${projectName}-${zipFileNameSubjoin}`
    : `${projectName}`;

  // 附加项目类型名称
  const fileName = suffix ? `${fullProjectName}-${suffix}` : `${fullProjectName}`;

  return doZip(source, dest, fileName);
}

module.exports = zip;
