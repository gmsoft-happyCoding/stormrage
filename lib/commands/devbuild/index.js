const path = require('path');
const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../projectInfo/getProjectRoot');
const { isMonoProject } = require('../../projectInfo/isProject');
const { packageType } = require('../../projectInfo/packageType');

async function devbuild({ projectDir, port, pick }) {
  const answers = await asking(projectDir);

  const projectRoot = getProjectRoot(
    answers.projectDir,
    isMonoProject(answers.projectDir) ? packageType.COMPONENTS : null
  );

  process.chdir(projectRoot);

  // 设置端口号
  process.env.PORT = port || 3030;

  require('../../react-scripts/dev-build')(pick);
}

module.exports = devbuild;
