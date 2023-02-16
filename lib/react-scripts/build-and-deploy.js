const yarnInstall = require('../utils/yarn-install');
const { LogHelper } = require('../utils/LogHelper');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const chalk = require('chalk');
const child_process = require('child_process');
const writeConfigToEnv = require('./utils/write-config-to-env');
const errorCode = require('../errorCode');

async function buildAndDeploy(args) {
  try {
    if (args.program.buildScript) {
      LogHelper.printSegment('project custom build');
      child_process.execSync(`yarn ${args.program.buildScript}`, {
        stdio: 'inherit',
        env: process.env,
      });
    } else {
      // build
      LogHelper.printSegment('project build');
      await require('./build-script');

      // 生成项目文档
      if (args.isComponentsProject && args.program.doc) {
        LogHelper.printSegment('doc build');
        child_process.execSync('yarn styleguidist build', {
          stdio: 'inherit',
          env: process.env,
        });
      }

      // gen-meta
      if (args.isComponentsProject) {
        LogHelper.printSegment('gen meta');
        require('./gen-meta-script');
      }
    }
  } catch (e) {
    console.log(e);
    process.exit(errorCode.BUILD_ERROR);
  }

  // deploy
  LogHelper.printSegment('deploy');
  await require('./deploy')(args);
}

async function run({ program, room, env, package, destDir, isComponentsProject, pluginOption }) {
  try {
    // 配置写入环境变量
    await writeConfigToEnv(pluginOption, env, room);

    // 选择要发布的组件
    if (isComponentsProject && program.pick) {
      const genEC = require('./gen-ec');
      await genEC();
    }

    await buildAndDeploy({
      program,
      room,
      env,
      package,
      projectConfig: process.env,
      destDir,
      isComponentsProject,
    });
  } catch (e) {
    e && console.error(e);
    process.exit(errorCode.BUILD_ERROR);
  }
}

module.exports = run;
