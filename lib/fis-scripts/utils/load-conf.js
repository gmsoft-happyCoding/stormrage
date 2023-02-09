const fs = require('fs-extra');
const chalk = require('chalk');
const program = require('commander');
const { projectConfigResolve, projectConfigNextResolve } = require('./path-resolve');
const errorCode = require('../../errorCode');
const { ConfHelper } = require('../../utils/ConfHelper');

module.exports = whichDeploy => {
  const { next } = program.opts();
  const path = (next ? projectConfigNextResolve : projectConfigResolve)(whichDeploy);

  if (!fs.pathExistsSync(path)) {
    const errorMessage = `没项目中没有同名的配置文件${whichDeploy}, 请检查 project-conf/media 目录!`;
    console.log(chalk.red(errorMessage));
    process.exit(errorCode.NO_CONF_ERROR);
  }
  if (next) {
    return ConfHelper.getYmlConfig(path);
  }
  return require(path);
};
