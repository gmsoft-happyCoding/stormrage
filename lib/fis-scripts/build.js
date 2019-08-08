const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fis3 = require('fis3');
const immer = require('immer');
const chalk = require('chalk');
const process = require('process');
const child_process = require('child_process');
const { nodeModuleResolve } = require('../utils/path-resolve');
const buildContext = require('./utils/build-context');
const { use, apply } = require('./utils/plugin');

async function run({ whichDeploy, config, buildDir }) {
  const { plugins, ...projectConfig } = config;

  if (plugins && plugins.length > 0) {
    plugins.map(plugin => use(plugin));
  }

  const context = buildContext(whichDeploy, 'production', projectConfig);

  const { inquirer, ...finalContext } = await apply(context);

  console.log('project config: ', chalk.blue(JSON.stringify(finalContext.config, null, 2)));

  const confPath = require.resolve('./fis-conf.js');

  // 传递参数给useConf
  finalContext.output = buildDir;

  child_process.execSync(
    `${nodeModuleResolve(
      '.bin',
      'fis3'
    )} release ${whichDeploy} --file ${confPath} --root ${process.cwd()} -c`,
    {
      stdio: 'inherit',
      env: {
        ...finalContext.config.envs,
        NODE_ENV: 'production',
        __context: JSON.stringify(finalContext),
      },
    }
  );

  return finalContext;
}

module.exports = run;
