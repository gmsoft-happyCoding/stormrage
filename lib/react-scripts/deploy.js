process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const { configResolve } = require('./utils/path-resolve');
const doDeploy = require('../doDeploy');
const chalk = require('chalk');
const paths = require(configResolve('paths'));
const errorCode = require('../errorCode');

const DEPLOY_TYPE = {
  ZIP: 'zip',
  SCP: 'scp',
};

// 获取项目配置的要发布的机器信息
function getDeployMachines(projectConfig) {
  let deployMachines = null;
  try {
    // 部署服务器信息
    deployMachines =
      projectConfig.REACT_APP_DEPLOY_MACHINES &&
      JSON.parse(projectConfig.REACT_APP_DEPLOY_MACHINES);
  } catch (e) {
    console.error('解析 REACT_APP_DEPLOY_MACHINES 失败, 请检查JSON语法\n', e);
    process.exit(errorCode.REACT_APP_DEPLOY_MACHINES_ERROR);
  }

  return deployMachines;
}

/**
 * 支持2种部署模式
 * scp: 使用scp复制文件到指定的目标服务器
 * zip: 在本地生成打包文件, 需要手动部署到目标服务器
 */
async function deploy({ env, room, projectConfig, destDir }) {
  const deployMachines = getDeployMachines(projectConfig);

  if (!deployMachines) {
    console.log(chalk.red(`没有找到配置信息(REACT_APP_DEPLOY_MACHINES), 请检查!`));
    return process.exit(errorCode.REACT_APP_DEPLOY_MACHINES_ERROR);
  }

  // 部署方式
  let deployType = projectConfig.REACT_APP_DEPLOY_TYPE;

  const buildDir = paths.appBuild;

  await doDeploy({ env, room, deployType, deployMachines, buildDir, destDir });
}

module.exports = deploy;
