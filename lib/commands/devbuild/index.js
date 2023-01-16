const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../project-info/getProjectRoot');
const { isMonoProject } = require('../../project-info/isProject');
const { packageType } = require('../../project-info/packageType');

async function devbuild({ projectDir, port, pick, pluginOption }) {
  const answers = await asking(projectDir);

  // must be components project
  const projectRoot = getProjectRoot(
    answers.projectDir,
    isMonoProject(answers.projectDir) ? packageType.COMPONENTS : null
  );

  process.chdir(projectRoot);

  // 设置端口号
  process.env.PORT = port || 3030;

  require('../../react-scripts/dev-build')(pick, pluginOption);
}

module.exports = devbuild;
