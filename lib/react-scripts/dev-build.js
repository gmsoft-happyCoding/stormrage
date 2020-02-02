const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const genEC = require('./gen-ec');

async function run(pick, pluginOption) {
  process.env.NODE_ENV = 'development';
  process.env.DEV_BUILD = true;

  // 选择要发布的组件
  if (pick) {
    await genEC();
  }

  require('./start')(pluginOption);
}

module.exports = run;
