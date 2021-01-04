const svnUltimate = require('node-svn-ultimate');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { set } = require('lodash');
const chalk = require('chalk');
const errorCode = require('./errorCode');

// 忽略的文件列表
const ignoreFiles = ['.svn'];
const space = '    ';
const deployInfoConfigPath = path.resolve('.', '.deployrc');
const deployInfoConfig = fs.existsSync(deployInfoConfigPath)
  ? fs.readJsonSync(deployInfoConfigPath)
  : null;

if (deployInfoConfig) console.log('.deployrc loaded');

// 部署配置
const infoUrl =
  deployInfoConfig && deployInfoConfig.info
    ? deployInfoConfig.info
    : 'https://192.168.2.10:8080/svn/GovProEleTrade/安装与配置/部署配置/发布配置';

// 脚本目录
const shellUrl =
  deployInfoConfig && deployInfoConfig.shell
    ? deployInfoConfig.shell
    : infoUrl.replace('发布配置', '脚本/分发与运行');

// 拉取到部署信息到本地的路径
const saveDeployInfoPath = path.resolve(os.tmpdir(), 'deployInfo');

// 先清空目录
fs.removeSync(saveDeployInfoPath);

const exportConfig = () => {
  if (fs.existsSync(saveDeployInfoPath)) return Promise.resolve(saveDeployInfoPath);

  return new Promise((resolve, reject) => {
    svnUltimate.commands.export(infoUrl, saveDeployInfoPath, { force: true }, function (err) {
      if (err) {
        console.log(err);
        process.exit(errorCode.SVN_ERROR);
        reject(err);
      }
      resolve(saveDeployInfoPath);
    });
  });
};

// 获取有哪些可以发布的环境
const getEnvs = async () => {
  const deployInfoDir = await exportConfig();
  const envs = fs.readdirSync(deployInfoDir).filter((env) => !ignoreFiles.includes(env));
  return envs;
};

// 获取环境下有哪些可以发布的机房
const getRooms = async (env) => {
  const deployInfoDir = await exportConfig();
  const rooms = fs
    .readdirSync(path.resolve(deployInfoDir, env))
    .filter((room) => !ignoreFiles.includes(room));
  return rooms;
};

// 获取机房中有哪些主机
const getMachines = async (env, room) => {
  const deployInfoDir = await exportConfig();
  const machines = fs
    .readdirSync(path.resolve(deployInfoDir, env, room))
    .filter((file) => file.startsWith('machine'))
    .map((machine) => ({
      key: machine.split('.')[0],
      path: path.resolve(deployInfoDir, env, room, machine),
    }));
  return machines;
};

// 获取机器信息
const getMachineInfo = async (env, room, machine) => {
  const deployInfoDir = await exportConfig();
  const machinePath = path.resolve(deployInfoDir, env, room, `${machine}.conf`);
  const infoObject = {};

  if (!fs.pathExistsSync(machinePath)) {
    const errorMessage = `不存在配置文件: ${machine}.conf, 请检查配置是否正确.`;
    console.log(chalk.red(errorMessage));
    process.exit(errorCode.NO_CONF_ERROR);
  }

  const info = fs
    .readFileSync(machinePath)
    .toString()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('#'))
    .forEach((line) => {
      const [key, value] = line.split('=');
      set(infoObject, key, value);
    });

  return infoObject;
};

// 拷贝配置文件到发布目录
const copyMachineConf = async (env, room, machine, dest) => {
  const deployInfoDir = await exportConfig();
  const machinePath = path.resolve(deployInfoDir, env, room, `${machine}.conf`);
  try {
    const destMachinePath = path.resolve(dest, machine);
    fs.ensureDirSync(destMachinePath);
    fs.copyFileSync(machinePath, path.resolve(destMachinePath, 'machine.conf'));
    console.log(chalk.yellow(`copyMachineConf to ${destMachinePath} success!`));
  } catch (err) {
    console.error(err);
    process.exit(errorCode.COPY_MACHINE_CONF_ERROR);
  }
};

function buildDeployPath(deployPath, projectSubPath = '') {
  // 转换为linux路径分隔符
  return path.join(deployPath, projectSubPath).replace(/\\/g, '/');
}

/**
 * 写部署文件
 * @param {string} fileName - 文件名
 * @param {string} deployPath - 发布根目录
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
      .map((line) => line.trim())
      .filter((line) => line.startsWith(fileName)).length;

    if (!existed) {
      fs.writeFileSync(
        appConfPath,
        `${fileName}${space}${buildDeployPath(deployPath, where.path)}${os.EOL}`,
        {
          flag: 'a',
        }
      );
    }
    console.log(chalk.yellow(`write ${appConfPath} success!`));
  } catch (err) {
    console.error(err);
    process.exit(errorCode.WRITE_APP_CONF_ERROR);
  }
};

/**
 * 拷贝目标机器的运行脚本
 * @param {*} env 发布环境
 * @param {*} room 发布机房
 * @param {*} destDir 结果产出目录
 */
const copyTargetSh = async (env, room, destDir) => {
  const dest = path.resolve(destDir, env, room);
  // 如果 dest 目录已经存在, 表示已经执行过拷贝操作
  if (fs.pathExistsSync(dest)) {
    console.log(chalk.yellow(`目录(${dest})已经存在, 跳过发布脚本拷贝操作!`));
    return;
  }

  await new Promise((resolve, reject) => {
    svnUltimate.commands.export(shellUrl, dest, { force: true }, function (err) {
      if (err) {
        console.log(err);
        process.exit(errorCode.SVN_ERROR);
        reject(err);
      }
      resolve();
    });
  });

  const svcinfoFile = path.resolve(dest, `${room}svcinfo.conf`);
  const renameSvcinfoFile = path.resolve(dest, `svcinfo.conf`);

  try {
    fs.moveSync(svcinfoFile, renameSvcinfoFile, {
      overwrite: true,
    });
  } catch (e) {
    console.log(chalk.red(`${svcinfoFile} 文件没有找到, 请确认是否需要该配置文件!`));
  }

  console.log(chalk.yellow(`拷贝目标机器运行脚本 to ${dest} success!`));
};

module.exports = {
  getEnvs,
  getRooms,
  getMachines,
  getMachineInfo,
  copyMachineConf,
  writeAppConf,
  copyTargetSh,
};
