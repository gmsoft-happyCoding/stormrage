const path = require('path');
const process = require('process');
const child_process = require('child_process');
const projectDirAsking = require('../buildAsking/projectDirAsking');
const getProjectRoot = require('../../project-info/getProjectRoot');

async function doc({ projectDir, package, isBuildMode, env, room, pluginOption }) {
  // 询问项目根目录位置
  const projectDirAnswers = await projectDirAsking(projectDir, package);

  // 获取项目根目录
  const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  let envAndRoomAnswers = {};
  if (isBuildMode) {
    // 询问要发布的环境和机房
    envAndRoomAnswers = await envAndRoomAsking(
      env,
      room,
      require('../../react-scripts/utils/get-project-envs')(),
      require('../../react-scripts/utils/get-project-rooms')()
    );
  }

  require('../../react-scripts/doc')(
    projectRoot,
    isBuildMode,
    envAndRoomAnswers.env,
    envAndRoomAnswers.room,
    pluginOption
  );
}

module.exports = doc;
