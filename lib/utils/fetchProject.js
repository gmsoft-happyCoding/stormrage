const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');
const errorCode = require('../errorCode');

const fetchProject = (svnUrl, svnCheckoutDir, forceSvnCheckout = true) => {
  const tempDir = path.resolve(svnCheckoutDir || os.homedir(), '__project_compile_temp');

  return new Promise(resolve => {
    const projectName = path.basename(svnUrl);
    const projectPath = path.join(tempDir, projectName);

    /**
     * 外部可以通过参数控制是否强制checkout, default: true.
     * 强制 或者 项目文件不存在时执行checkout
     */
    if (forceSvnCheckout || !fs.existsSync(projectPath)) {
      // 清理项目临时目录
      fs.removeSync(projectPath);

      svnUltimate.commands.checkout(svnUrl, projectPath, function (err) {
        if (err) {
          console.log(err);
          process.exit(errorCode.SVN_ERROR);
        }
        resolve(projectPath);
      });
    } else {
      resolve(projectPath);
    }
  });
};
module.exports = fetchProject;
