process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const { configResolve } = require('./utils/path-resolve');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const zip = require('./utils/zip');
const scp = require('./utils/scp');
const paths = require(configResolve('paths'));
const { getMachineInfo, copyMachineConf, writeAppConf } = require('../deployInfo');
const { get } = require('lodash');
const { packageType } = require('../projectInfo/packageType');

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
    throw e;
  }

  return deployMachines;
}

/**
 * 支持2种部署模式
 * scp: 使用scp复制文件到指定的目标服务器
 * zip: 在本地生成打包文件, 需要手动部署到目标服务器
 */
async function deploy({ room, env, package, projectConfig, destDir }) {
  const deployMachines = getDeployMachines(projectConfig);

  if (!deployMachines) {
    console.log(chalk.red(`没有找到配置信息(REACT_APP_DEPLOY_MACHINES), 请检查!`));
    return;
  }

  // 部署方式
  let deployType = projectConfig.REACT_APP_DEPLOY_TYPE;

  if (!deployType) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'deployType',
        message: '选择部署方式?',
        choices: [DEPLOY_TYPE.ZIP, DEPLOY_TYPE.SCP],
      },
    ]);
    deployType = answers.deployType;
  }

  switch (deployType) {
    case DEPLOY_TYPE.ZIP:
      // 发布代码保存目录
      const dest = path.resolve(destDir, env, room);
      const fileName = await zip(paths.appBuild, dest);
      for (const deployMachine of deployMachines) {
        // 拷贝机器信息配置文件
        await copyMachineConf(env, room, deployMachine.machine, dest);
        const machineInfo = await getMachineInfo(env, room, deployMachine.machine);
        // 写app配置文件
        for (const w of deployMachine.where) {
          if (!w || !w.rootKey) {
            console.error('where 配置错误请检查!');
          }

          writeAppConf(fileName, get(machineInfo, w.rootKey), deployMachine.machine, w, dest);
        }
      }
      break;
    case DEPLOY_TYPE.SCP:
      for (const deployMachine of deployMachines) {
        const machineInfo = await getMachineInfo(env, room, deployMachine.machine);

        for (const w of deployMachine.where) {
          if (!w || !w.rootKey) {
            console.error('where 配置错误请检查!');
          }
          await scp(
            paths.appBuild,
            {
              ...deployMachine,
              port: machineInfo.login.port,
              host: machineInfo.login.ip,
              username: machineInfo.login.user,
              path: path.join(get(machineInfo, w.rootKey), w.path),
            },
            true
          );
        }
      }
      break;
  }
}

module.exports = deploy;
