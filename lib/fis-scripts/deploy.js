process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const doDeploy = require('../doDeploy');

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
  throw new Error(errorMessage);
}

/**
 * 支持2种部署模式
 * scp: 使用scp复制文件到指定的目标服务器
 * zip: 在本地生成打包文件, 需要手动部署到目标服务器
 */
async function deploy({ env, room, config, buildDir, destDir }) {
  const deployMachines = getDeployMachines(config);

  // 部署方式
  let deployType = config.deploy.type;

  await doDeploy({ env, room, deployType, deployMachines, buildDir, destDir });
}

module.exports = deploy;
