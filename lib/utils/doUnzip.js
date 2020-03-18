const fs = require('fs');
const unzip = require('node-unzip-2');
const chalk = require('chalk');
const errorCode = require('../errorCode');

module.exports = (file, dest) => {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan(`开始文件解压...`));
    fs.createReadStream(file)
      .pipe(unzip.Extract({ path: dest }))
      .on('close', err => {
        if (err) {
          console.error(err);
          process.exit(errorCode.ZIP_ERROR);
        } else {
          console.log(chalk.cyan(`文件解压完成.`));
          resolve();
        }
      });
  });
};
