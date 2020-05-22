const path = require('path');
const process = require('process');
const projectDirAsking = require('../buildAsking/projectDirAsking');
const envAndRoomAsking = require('../buildAsking/envAndRoomAsking');
const getProjectRoot = require('../../project-info/getProjectRoot');
const { packageType } = require('../../project-info/packageType');
const { isComponentsProject, isFisProject } = require('../../project-info/isProject');
const fetchProject = require('../../utils/fetchProject');

async function bad({ projectDir, destDir, program }) {
  // svn参数优先
  let dir = program.svn ? await fetchProject(program.svn, program.forceSvnCheckout) : projectDir;

  // 询问项目根目录位置
  const projectDirAnswers = await projectDirAsking(dir, program.package);

  // 获取项目根目录
  const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  if (isFisProject(projectRoot)) {
    const projectEnvs = require('../../fis-scripts/utils/get-project-envs');
    const projectRooms = require('../../fis-scripts/utils/get-project-rooms');
    // 询问要发布的环境和机房
    const envAndRoomAnswers = await envAndRoomAsking(
      program.env,
      program.room,
      projectEnvs(),
      projectRooms()
    );
    // fis
    require('../../fis-scripts/build-and-deploy')({
      ...projectDirAnswers,
      ...envAndRoomAnswers,
      destDir,
      pluginOption: program.pluginOption,
    });
  } else {
    const projectEnvs = require('../../react-scripts/utils/get-project-envs');
    const projectRooms = require('../../react-scripts/utils/get-project-rooms');
    // 询问要发布的环境和机房
    const envAndRoomAnswers = await envAndRoomAsking(
      program.env,
      program.room,
      projectEnvs(),
      projectRooms()
    );

    // react
    require('../../react-scripts/build-and-deploy')({
      ...projectDirAnswers,
      ...envAndRoomAnswers,
      destDir,
      program,
      isComponentsProject:
        isComponentsProject(projectRoot) || projectDirAnswers.package === packageType.COMPONENTS,
      pluginOption: program.pluginOption,
    });
  }
}

module.exports = bad;
