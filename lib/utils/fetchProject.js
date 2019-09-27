const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');

const tempDir = path.resolve(os.homedir(), '__project_compile_temp');

const fetchProject = (svnUrl, svnCheckout = true) => {
  return new Promise((resolve, reject) => {
    const projectName = path.basename(svnUrl);
    const projectPath = path.join(tempDir, projectName);

    // 外部可以通过参数控制是否清理缓存, 重新checkout.
    // 默认 svnCheckout = true
    if (svnCheckout) {
      // 清理项目临时目录
      fs.removeSync(projectPath);

      svnUltimate.commands.export(svnUrl, projectPath, function(err) {
        if (err) {
          console.log(err);
          reject(err);
        }

        resolve(projectPath);
      });
    } else {
      resolve(projectPath);
    }
  });
};
module.exports = fetchProject;
