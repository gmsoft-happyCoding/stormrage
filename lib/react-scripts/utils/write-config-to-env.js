const chalk = require('chalk');
const path = require('path');
const program = require('commander');
const fs = require('fs-extra');
const { forEach, isString } = require('lodash');
const { configResolve } = require('./path-resolve');
const applyPlugins = require('./apply-plugins');
const paths = require(configResolve('paths'));
const { ConfHelper } = require('../../utils/ConfHelper');
const { EnvHelper } = require('../../utils/EnvHelper');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');

const writeConfigToEnv = async (pluginOption, env, room) => {
  // 判断当前是否是start命令
  const isStart = process.argv[1].endsWith('-start.js') || process.argv[1].endsWith('-devbuild.js');

  // 如果是start，则默认读取本地的配置文件（project-config/debug.yml）
  const { next, conf = 'default', field } = program.opts();

  // 识别到启用新的环境变量加载模式
  if (next) {
    // 优先读取本地的配置文件（project-config/default.yml）
    const defaultLocalConfPath = path.resolve(
      paths.projectConfig,
      `${conf.replace(/\.yml$/, '')}.yml`
    );
    const confIsExist = fs.existsSync(defaultLocalConfPath);
    let confEnv = null;
    if (confIsExist) {
      // 默认文件存在，读取默认配置
      confEnv = await ConfHelper.getYmlConfig(defaultLocalConfPath);
    } else {
      // 抛出异常
      ErrorHelper.throwError(ErrorCode.ERROR_DEV_CONFIG_NOT_EXIST);
    }

    let debugConfEnv = {};
    // 启动指令，需要将debug.yml配置文件中的配置注入到环境变量中
    if (isStart) {
      // 读取debug.yml配置文件
      const debugLocalConfPath = path.resolve(paths.projectConfig, 'debug.yml');
      const debugConfIsExist = fs.existsSync(debugLocalConfPath);
      if (debugConfIsExist) {
        // 默认文件存在，读取默认配置
        debugConfEnv = await ConfHelper.getYmlConfig(debugLocalConfPath);
      } else {
        // 抛出异常
        ErrorHelper.throwError(ErrorCode.ERROR_DEV_CONFIG_NOT_EXIST);
      }
    }

    // 将配置结构扁平化，方便注入
    let flattedConf = {
      ...ConfHelper.convertConfToEnvironment(confEnv),
      ...ConfHelper.convertConfToEnvironment(debugConfEnv),
    };

    if (isStart) {
      flattedConf = ConfHelper.replaceEnvForSelf(flattedConf);
    }

    // 获取过滤白名单
    const envWhiteList = ConfHelper.getEnvWhitelist(field);
    // 在环境变量上标记出来此次Start所枚举的环境变量Key的模式，后续编译过程会根据此环境变量进行环境变量过滤
    flattedConf.GMSOFT_ENV_FILTER = `^(${envWhiteList.join('|')})`;
    console.log(chalk.magenta('=========================== 环境变量 ==========================='));
    console.log(flattedConf);

    // 将环境变量配置写入环境变量
    EnvHelper.writeEnv(flattedConf);
  }

  const finalContext = await applyPlugins(pluginOption, env, room);

  // 存在，则注入额外的环境变量
  if (finalContext.config.envs) {
    console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config.envs, null, 2)));
    // 配置放入环境变量
    forEach(finalContext.config.envs, (value, key) => {
      if (isString(value)) process.env[key] = value;
      else process.env[key] = JSON.stringify(value);
    });
  }
};

module.exports = writeConfigToEnv;
