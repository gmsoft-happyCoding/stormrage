const chalk = require('chalk');
const { forEach, isString } = require('lodash');
const applyPlugins = require('./apply-plugins');

const writeConfigToEnv = async (pluginOption, env, room) => {
  const finalContext = await applyPlugins(pluginOption, env, room);

  console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config.envs, null, 2)));

  // 配置放入环境变量
  forEach(finalContext.config.envs, (value, key) => {
    if (isString(value)) process.env[key] = value;
    else process.env[key] = JSON.stringify(value);
  });
};

module.exports = writeConfigToEnv;
