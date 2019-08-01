const path = require('path');
const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../projectInfo/getProjectRoot');
const { packageType } = require('../../projectInfo/packageType');
const { isComponentsProject } = require('../../projectInfo/isProject');

async function start({ projectDir, package, port }) {
  const answers = await asking(projectDir, package);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  process.chdir(projectRoot);

  if (port) {
    process.env.PORT = port;
  } else {
    process.env.PORT =
      isComponentsProject(projectRoot) || answers.package === packageType.COMPONENTS ? 3030 : 3000;
  }

  require('../../react-scripts/start');
}

module.exports = start;
