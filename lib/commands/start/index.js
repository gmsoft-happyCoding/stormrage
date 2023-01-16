const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../project-info/getProjectRoot');
const { packageType } = require('../../project-info/packageType');
const { isComponentsProject, isFisProject } = require('../../project-info/isProject');

async function start({ projectDir, package, port, output, clean, pluginOption }) {
  const answers = await asking(projectDir, package);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  process.chdir(projectRoot);

  if (isFisProject(projectRoot)) {
    // fis
    require('../../fis-scripts/start')(output, clean, pluginOption);
  } else {
    // react
    if (port) {
      process.env.PORT = port;
    } else {
      process.env.PORT =
        isComponentsProject(projectRoot) || answers.package === packageType.COMPONENTS
          ? 3030
          : 3000;
    }

    require('../../react-scripts/start')(pluginOption);
  }
}

module.exports = start;
