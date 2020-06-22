const download = require('download-git-repo');
const chalk = require('chalk');
const errorCode = require('../../errorCode');

// 下载模板
function downloadRepo(templateType, projectDir, repositoryOwner) {
  console.log(chalk.magenta('开始下载模板...'));
  return new Promise((resolve, reject) => {
    download(
      // 由于GFW github:gmsoft-happyCoding 暂不可用, 先切换为 gitlab
      `${repositoryOwner || 'gitlab:angular-moon'}/react-${templateType}-template`,
      projectDir,
      err => {
        if (err) {
          console.error(err);
          process.exit(errorCode.DOWNLOAD_ERROR);
        } else console.log(chalk.magenta('下载完成'));
        resolve();
      }
    );
  });
}

module.exports = downloadRepo;
