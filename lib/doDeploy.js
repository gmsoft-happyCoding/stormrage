process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const zip = require('./utils/zip');
const scp = require('./utils/scp');
const errorCode = require('./errorCode');

const { getMachineInfo, copyMachineConf, writeAppConf, copyTargetSh } = require('./deployInfo');
const { get } = require('lodash');

const DEPLOY_TYPE = {
  ZIP: 'zip',
  SCP: 'scp',
};

/**
 * 支持2种部署模式
 * scp: 使用scp复制文件到指定的目标服务器
 * zip: 在本地生成打包文件, 需要手动部署到目标服务器
 * @param {object} args
 * @param {string} args.env - 发布环境
 * @param {string} args.room - 发布机房
 * @param {string} args.deployType - 发布方式 scp | zip
 * @param {string} args.deployMachines - 发布配置
 * @param {string} args.buildDir - 代码编译结果目录
 * @param {string} args.destDir - zip 产出目录
 * @param {string} args.zipFileNameSubjoin - 生成的包文件附加名称, 用于同一项目通过代码剪裁生成不同结果时能生成不同名称的zip
 */
async function deploy({
  env,
  room,
  deployType,
  deployMachines,
  buildDir,
  destDir,
  zipFileNameSubjoin,
}) {
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
      // 拷贝目标机器执行脚本
      await copyTargetSh(env, room, destDir);
      // 发布代码保存目录
      const dest = path.resolve(destDir, env, room);
      const fileName = await zip(buildDir, dest, zipFileNameSubjoin);
      for (const deployMachine of deployMachines) {
        // 拷贝机器信息配置文件
        await copyMachineConf(env, room, deployMachine.machine, dest);
        const machineInfo = await getMachineInfo(env, room, deployMachine.machine);
        // 写app配置文件
        for (const w of deployMachine.where) {
          if (!w || !w.rootKey) {
            console.error('where 配置错误请检查!');
            return process.exit(errorCode.CONF_ERROR);
          }

          if (!get(machineInfo, w.rootKey)) {
            console.error(
              `在配置文件 ${env}-${room}-${deployMachine.machine} 中没有找到 ${w.rootKey}, 请检查!`
            );
            return process.exit(errorCode.CONF_ERROR);
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
            return process.exit(errorCode.CONF_ERROR);
          }

          // 如果没有配置任何服务器登录方式, 尝试使用此配置连接一次
          let pwd = {};
          if (deployMachine.password === undefined && deployMachine.privateKey === undefined) {
            (pwd.privateKey = path.resolve(os.userInfo().homedir, '.ssh', 'id_rsa')),
              (pwd.passphrase = '');
          }

          await scp(
            buildDir,
            {
              ...deployMachine,
              port: machineInfo.login.port,
              host: machineInfo.login.ip,
              username: machineInfo.login.user,
              path: path.join(get(machineInfo, w.rootKey), w.path || ''),
              ...pwd,
            },
            true
          );
        }
      }
      break;
  }
}

module.exports = deploy;
