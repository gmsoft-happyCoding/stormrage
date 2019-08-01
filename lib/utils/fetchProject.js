const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');

const tempDir = path.resolve(os.tmpdir(), '__project_temp');

const fetchProject = svnUrl => {
  return new Promise((resolve, reject) => {
    fs.emptyDirSync(tempDir);
    svnUltimate.commands.checkout(svnUrl, tempDir, function(err) {
      if (err) {
        console.log(err);
        reject(err);
      }

      resolve(tempDir);
    });
  });
};
module.exports = fetchProject;
