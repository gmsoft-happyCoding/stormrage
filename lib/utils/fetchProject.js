const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');

const tempDir = path.resolve(os.homedir(), '__project_compile_temp');

const fetchProject = svnUrl => {
  return new Promise((resolve, reject) => {
    // 由外部工具完成临时文件夹的清理工作
    // fs.emptyDirSync(tempDir);
    const projectName = path.basename(svnUrl);
    const projectPath = path.join(tempDir, projectName);

    svnUltimate.commands.export(svnUrl, projectPath, function(err) {
      if (err) {
        console.log(err);
        reject(err);
      }

      resolve(projectPath);
    });
  });
};
module.exports = fetchProject;
