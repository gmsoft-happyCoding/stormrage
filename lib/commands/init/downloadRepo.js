const download = require("download-git-repo");
const chalk = require("chalk");

// 下载模板
function downloadRepo(templateType, projectDir) {
  console.log(chalk.magenta("开始下载模板..."));
  return new Promise((resolve, reject) => {
    download(
      `github:gmsoft-happyCoding/react-${templateType}-template`,
      projectDir,
      err => {
        if (err) console.error(err);
        else console.log(chalk.magenta("下载完成"));
        resolve();
      }
    );
  });
}

module.exports = downloadRepo;
