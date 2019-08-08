const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');

// 忽略的文件列表
const ignoreFiles = ['.svn'];
const space = '    ';

const checkout = () => {
  const svnUrl = 'https://192.168.2.10:8080/svn/GovProEleTrade/安装与配置/部署配置/发布配置';
  const checkoutDir = path.resolve(os.tmpdir(), 'deployInfo');

  return new Promise((resolve, reject) => {
    svnUltimate.commands.checkout(svnUrl, checkoutDir, function(err) {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(checkoutDir);
    });
  });
};

// 获取有哪些可以发布的环境
const getEnvs = async () => {
  const deployInfoDir = await checkout();
  const envs = fs.readdirSync(deployInfoDir).filter(env => !ignoreFiles.includes(env));
  return envs;
};

// 获取环境下有哪些可以发布的机房
const getRooms = async env => {
  const deployInfoDir = await checkout();
  const rooms = fs
    .readdirSync(path.resolve(deployInfoDir, env))
    .filter(room => !ignoreFiles.includes(room));
  return rooms;
};

// 获取机房中有哪些主机
const getMachines = async (env, room) => {
  const deployInfoDir = await checkout();
  const machines = fs
    .readdirSync(path.resolve(deployInfoDir, env, room))
    .filter(file => file.startsWith('machine'))
    .map(machine => ({
      key: machine.split('.')[0],
      path: path.resolve(deployInfoDir, env, room, machine),
    }));
  return machines;
};

// 获取机器信息
const getMachineInfo = async (env, room, machine) => {
  const deployInfoDir = await checkout();
  const machinePath = path.resolve(deployInfoDir, env, room, `${machine}.conf`);
  const infoObject = {};

  if (!fs.pathExistsSync(machinePath)) {
    const errorMessage = `不存在配置文件: ${machine}.conf, 请检查配置是否正确.`;
    console.log(chalk.red(errorMessage));
    throw new Error(errorMessage);
  }

  const info = fs
    .readFileSync(machinePath)
    .toString()
    .split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('#'))
    .forEach(line => {
      const [key, value] = line.split('=');
      set(infoObject, key, value);
    });

  return infoObject;
};

// 拷贝配置文件到发布目录
const copyMachineConf = async (env, room, machine, dest) => {
  const deployInfoDir = await checkout();
  const machinePath = path.resolve(deployInfoDir, env, room, `${machine}.conf`);
  try {
    const destMachinePath = path.resolve(dest, machine);
    fs.ensureDirSync(destMachinePath);
    fs.copyFileSync(machinePath, path.resolve(destMachinePath, 'machine.conf'));
    console.log(chalk.yellow(`copyMachineConf to ${destMachinePath} success!`));
  } catch (err) {
    console.error(err);
  }
};

/**
 * 写部署文件
 * @param {string} fileName - 文件名
 * @param {string} deployRoot - 发布根目录
 * @param {string} machine - 机器代码
 * @param {object} where - {rootKey: 根目录代码, path: 子路径}
 * @param {string} dest - 发布文件保存路径
 */
const writeAppConf = (fileName, deployPath, machine, where, dest) => {
  const appConfPath = path.resolve(dest, machine, `${where.rootKey}.app`);

  try {
    fs.ensureFileSync(appConfPath);

    // 读取文件, 看是否已经配置过了
    const existed = fs
      .readFileSync(appConfPath)
      .toString()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith(fileName)).length;

    if (!existed) {
      fs.writeFileSync(
        appConfPath,
        `${os.EOL}${fileName}${space}${path.join(deployPath, where.path)}`,
        {
          flag: 'a',
        }
      );
    }
    console.log(chalk.yellow(`write ${appConfPath} success!`));
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  getEnvs,
  getRooms,
  getMachines,
  getMachineInfo,
  copyMachineConf,
  writeAppConf,
};