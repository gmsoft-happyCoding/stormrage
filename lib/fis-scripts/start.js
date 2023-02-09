const yarnInstall = require('../utils/yarn-install');

// 如果没有安装依赖, 先安装依赖
yarnInstall();
const chalk = require('chalk');
const process = require('process');
const path = require('path');
const lodash = require('lodash');
const program = require('commander');
const child_process = require('child_process');
const loadConf = require('./utils/load-conf');
const buildContext = require('./utils/build-context');
const { use, apply } = require('../utils/plugin');
const { ConfHelper } = require('../utils/ConfHelper');

const MEDIA_NAME = 'start';

async function run(output, clean, pluginOption) {
  const { next, conf = 'default', field } = program.opts();

  let context = null;

  // 如果发现next 标记，则使用新的配置加载方式
  if (next) {
    const packConf = require(path.resolve('.', 'project-conf', 'pack-conf.js'));
    // 获取过滤白名单
    const envWhiteList = ConfHelper.getEnvWhitelist(field);
    // 读取配置并过滤
    const confEnv = lodash.pick(await loadConf(conf), envWhiteList);
    // 将配置结构扁平化，方便注入
    const fullEnv = ConfHelper.convertConfToEnvironment(confEnv);
    // 在环境变量上标记出来此次Start所枚举的环境变量Key的模式
    fullEnv.GMSOFT_ENV_FILTER = `^(${envWhiteList.join('|')})`;
    context = buildContext(
      MEDIA_NAME,
      'development',
      {
        packConf,
        vars: fullEnv,
        ignoreFiles: ['package.json'],
        notUseHash: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notUseHash`],
        notOptimizeJs: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notOptimizeJs`],
        notOptimizeCss: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notOptimizeCss`],
        pack: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.pack`] ?? true,
        deploy: {
          type: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.deployType`] ?? 'local',
          subPath: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.deploySubPath`] ?? '',
        },
        domain: fullEnv[`${ConfHelper.CONF_DEFAULT_FIELD_NAME}.domain`],
      },
      pluginOption
    );
  } else {
    const { plugins, ...projectConfig } = loadConf(MEDIA_NAME);
    if (plugins && plugins.length > 0) {
      plugins.map(plugin => use(plugin));
    }
    context = buildContext(MEDIA_NAME, 'development', projectConfig, pluginOption);
  }

  // omit inquirer, produce, pluginOption
  const { inquirer, produce, pluginOption: _pluginOption, ...finalContext } = await apply(context);

  // 通过 context 传递 output 参数给useConf
  finalContext.output = output;

  console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config, null, 2)));

  const confPath = require.resolve('./fis-conf.js');

  child_process.execSync(
    `yarn fis3 release ${MEDIA_NAME} --file ${confPath} --root ${process.cwd()} -${
      clean ? 'wuL' : 'wucL'
    }`,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...finalContext.config.envs,
        NODE_ENV: 'development',
        __context: JSON.stringify(finalContext),
      },
    }
  );
}

module.exports = run;
