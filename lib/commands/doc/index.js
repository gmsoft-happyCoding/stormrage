const path = require('path');
const process = require('process');
const child_process = require('child_process');
const asking = require('./asking');
const getProjectRoot = require('../../project-info/getProjectRoot');

async function doc({ projectDir, package, isBuildMode, env, room, pluginOption }) {
  const answers = await asking(projectDir, package, isBuildMode, env, room);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  require('../../react-scripts/doc')(
    projectRoot,
    isBuildMode,
    answers.env,
    answers.room,
    pluginOption
  );
}

module.exports = doc;
