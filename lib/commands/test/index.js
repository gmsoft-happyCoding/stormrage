const path = require('path');
const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../project-info/getProjectRoot');

async function test({ projectDir, package }) {
  const answers = await asking(projectDir, package);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  process.chdir(projectRoot);

  require('../../react-scripts/test');
}

module.exports = test;
