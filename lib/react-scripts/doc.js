const writeConfigToEnv = require('./utils/write-config-to-env');
const yarnInstall = require('../utils/yarn-install');
const child_process = require('child_process');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

async function run(projectRoot, isBuildMode, env, room, pluginOption) {
  // 配置写入环境变量
  await writeConfigToEnv(pluginOption, env, room);

  const command = `yarn styleguidist ${isBuildMode ? 'build' : 'server --open'}`;

  child_process.execSync(command, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
  });
}

module.exports = run;
