const { getMachineInfo, copyMachineConf, writeAppConf } = require('../deployInfo');

const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const loadConf = require('./utils/load-Conf');
const buildContext = require('./utils/build-context');
const { use, apply } = require('./utils/plugin');

async function run({ room, env, destDir, pluginOption }) {
  const whichDeploy = `${env}-${room}`;

  const config = loadConf(whichDeploy);

  const { plugins, ...projectConfig } = config;

  if (plugins && plugins.length > 0) {
    plugins.map(plugin => use(plugin));
  }

  const context = buildContext(whichDeploy, 'production', projectConfig, pluginOption);

  const { inquirer, ...finalContext } = await apply(context);

  console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config, null, 2)));

  const projectName = path.basename(process.cwd());

  const buildDir = path.resolve(os.tmpdir(), projectName);
  fs.emptyDirSync(buildDir);

  await require('./build')({ whichDeploy, buildDir, context: finalContext });
  await require('./deploy')({ room, env, config: finalContext.config, buildDir, destDir });
}

module.exports = run;
