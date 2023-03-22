const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');

function install(forceInstall = false) {
  const monoRoot = path.resolve(process.cwd(), '..', '..');

  const isMono = fs.pathExistsSync(path.join(monoRoot, 'packages'));

  const root = isMono ? monoRoot : process.cwd();

  const node_modules = path.join(root, 'node_modules');

  // 如果已经安装过依赖则不再安装，除非强制安装
  if (fs.pathExistsSync(node_modules) && !forceInstall) return;

  child_process.execSync('yarn', { stdio: 'inherit', cwd: root });
}

module.exports = install;
