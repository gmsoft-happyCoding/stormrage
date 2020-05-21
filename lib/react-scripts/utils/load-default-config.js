const { configResolve } = require('./path-resolve');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require(configResolve('paths'));
const errorCode = require('../../errorCode');

// 环境变量配置文件
const projectConfigFiles = fs.readdirSync(paths.projectConfig);
// 可以使用的配置文件
const configs = projectConfigFiles.map(file => file.split('.')[0]);

/**
 * 加载默认配置文件
 * https://github.com/lorenwest/node-config
 */
function load() {
  // 设置标识, 确定使用哪一个配置文件
  process.env.NODE_CONFIG_DIR = paths.projectConfig;
  // 加载配置文件, 配置到 process.env
  return require('config');
}

module.exports = load;
