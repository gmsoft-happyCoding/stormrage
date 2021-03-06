process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const { get } = require('lodash');
const doDeploy = require('../doDeploy');
const errorCode = require('../errorCode');

const DEPLOY_TYPE = {
  ZIP: 'zip',
  SCP: 'scp',
};

// 获取项目配置的要发布的机器信息
function getDeployMachines(config) {
  if (config && config.deploy && config.deploy.machines && config.deploy.machines.length > 0)
    return config.deploy.machines;

  const errorMessage = '没有发布配置相关信息, 请检查 deploy.machines 是否配置';

  console.error(errorMessage);
  process.exit(errorCode.CONF_ERROR);
}

// 获取项目配置的要发布的机器信息
function getZipFileNameSubjoin(config) {
  return get(config, 'deploy.zipFileNameSubjoin');
}

/**
 * 支持2种部署模式
 * scp: 使用scp复制文件到指定的目标服务器
 * zip: 在本地生成打包文件, 需要手动部署到目标服务器
 */
async function deploy({ env, room, config, buildDir, destDir }) {
  const deployMachines = getDeployMachines(config);
  const zipFileNameSubjoin = getZipFileNameSubjoin(config);

  // 部署方式
  let deployType = config.deploy.type;

  await doDeploy({ env, room, deployType, deployMachines, buildDir, destDir, zipFileNameSubjoin });
}

module.exports = deploy;
