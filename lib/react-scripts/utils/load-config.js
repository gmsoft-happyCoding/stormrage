const { configResolve } = require('./path-resolve');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require(configResolve('paths'));
const errorCode = require('../../errorCode');

// 环境变量配置文件
const projectConfigFiles = fs.readdirSync(paths.projectConfig);
// 可以使用的配置文件
const configFiles = projectConfigFiles.map(file => file.split('.')[0]);

/**
 * 加载配置文件
 * https://github.com/lorenwest/node-config
 * @param {string} env - 发布目标环境
 * @param {string} env - 发布目标机房
 */
function loadConfig(env, room) {
  // 设置标识, 确定使用哪一个配置文件
  process.env.NODE_CONFIG_DIR = paths.projectConfig;
  process.env.NODE_CONFIG_ENV = env;
  process.env.NODE_APP_INSTANCE = room;
  // 加载配置文件, 配置到 process.env
  return require('config');
}

function load(env, room) {
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';

  const whichDeploy = `${env}-${room}`;

  if (whichDeploy && configFiles.includes(whichDeploy)) {
    return loadConfig(env, room);
  } else {
    console.log(chalk.red(`没项目中没有同名的环境配置文件${whichDeploy}, 请检查 env 目录!`));
    process.exit(errorCode.NO_CONF_ERROR);
  }
}

module.exports = load;
