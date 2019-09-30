const fs = require('fs-extra');
const chalk = require('chalk');
const { projectConfigResolve } = require('./path-resolve');
const errorCode = require('../../errorCode');

module.exports = whichDeploy => {
  const path = projectConfigResolve(whichDeploy);

  if (!fs.pathExistsSync(path)) {
    const errorMessage = `没项目中没有同名的配置文件${whichDeploy}, 请检查 project-conf/media 目录!`;
    console.log(chalk.red(errorMessage));
    process.exit(errorCode.NO_CONF_ERROR);
  }

  return require(path);
};
