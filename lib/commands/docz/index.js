const path = require('path');
const process = require('process');
const child_process = require('child_process');
const asking = require('./asking');
const getProjectRoot = require('../../projectInfo/getProjectRoot');

const { nodeModuleResolve } = require('../../utils/path-resolve');

async function docz({ projectDir, package }) {
  const answers = await asking(projectDir, package);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  child_process.execSync(`${nodeModuleResolve('.bin', 'docz')} dev`, {
    stdio: 'inherit',
    cwd: projectRoot,
  });
}

module.exports = docz;
