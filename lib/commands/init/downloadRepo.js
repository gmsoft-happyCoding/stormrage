const download = require('download-git-repo');
const chalk = require('chalk');
const TEMPLATE_TYPE = require('./templateType');
const errorCode = require('../../errorCode');

function getRepoName(templateType) {
  if (templateType === TEMPLATE_TYPE.LIB) {
    return 'lib-template';
  }
  return `react-${templateType}-template`;
}

// 下载模板
function downloadRepo(templateType, projectDir, repositoryOwner, templateRepo) {
  console.log(chalk.magenta('开始下载模板...'));
  return new Promise((resolve, reject) => {
    download(
      templateRepo ||
        `${repositoryOwner || 'github:gmsoft-happyCoding'}/${getRepoName(templateType)}`,
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
