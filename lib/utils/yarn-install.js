const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');

function install(forceInstall = false, rootDir = null) {
  const monoRoot = path.resolve(process.cwd(), '..', '..');

  const isMono = fs.pathExistsSync(path.join(monoRoot, 'packages'));

  let root = isMono ? monoRoot : process.cwd();

  root = rootDir ? rootDir : root;

  const node_modules = path.join(root, 'node_modules');

  // 不在进行依赖安装跳过，会产生一些问题，始终尝试进行安装，并增加--frozen-lockfile参数，不更新lock文件
  // 如果已经安装过依赖则不再安装，除非强制安装
  // if (fs.pathExistsSync(node_modules) && !forceInstall) return;

  child_process.execSync('yarn install --frozen-lockfile', { stdio: 'inherit', cwd: root });
}

module.exports = install;
