const { configResolve } = require('./utils/path-resolve');
const { nodeModuleResolve } = require('../utils/path-resolve');

const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require(configResolve('paths'));
const child_process = require('child_process');
const loadDeployEnv = require('./utils/load-deploy-env');
const errorCode = require('../errorCode');

function printSegment(title) {
  console.log(chalk.magenta(`---------------------------${title}---------------------------`));
}

async function buildAndDeploy(args) {
  try {
    // build
    printSegment('project build');
    await require('./build');

    // 生成项目文档
    if (args.isComponentsProject && args.program.doc) {
      printSegment('docz build');
      child_process.execSync(`${nodeModuleResolve('.bin', 'docz')} build`, {
        stdio: 'inherit',
      });
    }

    // gen-meta
    if (args.isComponentsProject) {
      printSegment('gen meta');
      require('./gen-meta');
    }
  } catch (e) {
    process.exit(errorCode.BUILD_ERROR);
  }

  // deploy
  printSegment('deploy');
  await require('./deploy')(args);
}

async function run({ program, room, env, package, destDir, isComponentsProject }) {
  try {
    const whichDeploy = program.envFile ? program.envFile : `${env}-${room}`;

    const projectConfig = await loadDeployEnv(whichDeploy);

    // 选择要发布的组件
    if (isComponentsProject && program.pick) {
      const genEC = require('./gen-ec');
      await genEC();
    }

    console.log('projectConfig:', projectConfig);

    await buildAndDeploy({
      program,
      room,
      env,
      package,
      projectConfig,
      destDir,
      isComponentsProject,
    });
  } catch (e) {
    e && console.error(e);
  }
}

module.exports = run;
