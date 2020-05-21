const child_process = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const projectRoot = require('./projectRoot');
const hasYarn = require('../../utils/hasYarn');
const errorCode = require('../../errorCode');

// 安装依赖
function install(projectDir) {
  if (!hasYarn) {
    console.log(
      chalk.yellow(
        '请安装 yarn (https://yarnpkg.com/zh-Hans/docs/install#windows-stable).\n然后在项目根目录执行命令 yarn 安装项目所需依赖.'
      )
    );
    return process.exit(errorCode.NO_YARN_ERROR);
  }

  const root = projectRoot(projectDir);
  const node_modules = path.join(root, 'node_modules');
  if (fs.existsSync(node_modules)) return;
  console.log(chalk.magenta('安装项目所需依赖...'));
  child_process.execSync('yarn', {
    stdio: 'inherit',
    cwd: root,
  });
}

module.exports = install;
