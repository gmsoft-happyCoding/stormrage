const { getMachineInfo, copyMachineConf, writeAppConf } = require('../deployInfo');

const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const child_process = require('child_process');
const loadConf = require('./utils/load-Conf');

async function run({ room, env, destDir }) {
  const whichDeploy = `${env}-${room}`;

  const config = loadConf(whichDeploy);

  const projectName = path.basename(process.cwd());

  const buildDir = path.resolve(os.tmpdir(), projectName);
  fs.emptyDirSync(buildDir);

  await require('./build')({ whichDeploy, buildDir, config });
  await require('./deploy')({ room, env, config, buildDir, destDir });
}

module.exports = run;
