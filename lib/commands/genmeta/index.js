const path = require('path');
const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../project-info/getProjectRoot');
const { isMonoProject } = require('../../project-info/isProject');
const { packageType } = require('../../project-info/packageType');

async function genmeta({ projectDir, pick }) {
  const answers = await asking(projectDir);

  const projectRoot = getProjectRoot(
    answers.projectDir,
    isMonoProject(answers.projectDir) ? packageType.COMPONENTS : null
  );

  process.chdir(projectRoot);

  require('../../react-scripts/gen-meta')(pick);
}

module.exports = genmeta;
