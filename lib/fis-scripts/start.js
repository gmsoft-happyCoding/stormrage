const yarnInstall = require('../utils/yarn-install');

// 如果没有安装依赖, 先安装依赖
yarnInstall();
const fis3 = require('fis3');
const chalk = require('chalk');
const process = require('process');
const child_process = require('child_process');
const loadConf = require('./utils/load-Conf');
const buildContext = require('./utils/build-context');
const { use, apply } = require('./utils/plugin');
const { nodeModuleResolve } = require('../utils/path-resolve');

const MEDIA_NAME = 'start';

async function run(output, clean, pluginOption) {
  const { plugins, ...projectConfig } = loadConf(MEDIA_NAME);

  if (plugins && plugins.length > 0) {
    plugins.map(plugin => use(plugin));
  }

  const context = buildContext(MEDIA_NAME, 'development', projectConfig, pluginOption);

  const { inquirer, ...finalContext } = await apply(context);

  // 通过 context 传递 output 参数给useConf
  finalContext.output = output;

  console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config, null, 2)));

  const confPath = require.resolve('./fis-conf.js');

  child_process.execSync(
    `${nodeModuleResolve(
      '.bin',
      'fis3'
    )} release ${MEDIA_NAME} --file ${confPath} --root ${process.cwd()} -${clean ? 'wuL' : 'wucL'}`,
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
