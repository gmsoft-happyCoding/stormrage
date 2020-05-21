const writeConfigToEnv = require('./utils/write-config-to-env');
const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

async function run(pluginOption) {
  await writeConfigToEnv(pluginOption);

  require('./start-script');
}

module.exports = run;
