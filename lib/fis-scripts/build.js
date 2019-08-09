const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fis3 = require('fis3');

const process = require('process');
const child_process = require('child_process');
const { nodeModuleResolve } = require('../utils/path-resolve');

async function run({ whichDeploy, context, buildDir }) {
  const confPath = require.resolve('./fis-conf.js');

  // 传递参数给useConf
  context.output = buildDir;

  child_process.execSync(
    `${nodeModuleResolve(
      '.bin',
      'fis3'
    )} release ${whichDeploy} --file ${confPath} --root ${process.cwd()} -c`,
    {
      stdio: 'inherit',
      env: {
        ...context.config.envs,
        NODE_ENV: 'production',
        __context: JSON.stringify(context),
      },
    }
  );
}

module.exports = run;
