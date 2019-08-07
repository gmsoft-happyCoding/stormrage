const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');

function install() {
  const monoRoot = path.resolve(process.cwd(), '..', '..');

  const isMono = fs.pathExistsSync(path.join(monoRoot, 'packages'));

  const root = isMono ? monoRoot : process.cwd();

  const node_modules = path.join(root, 'node_modules');

  if (fs.pathExistsSync(node_modules)) return;

  child_process.execSync('yarn', { stdio: 'inherit', cwd: root });
}

module.exports = install;
