const fs = require('fs');
const path = require('path');
const { configResolve } = require('./path-resolve');
const errorCode = require('../../errorCode');

module.exports = () => {
  const paths = require(configResolve('paths'));

  try {
    return fs
      .readdirSync(paths.projectConfig)
      .filter(fileName => /.*-.*/.test(fileName))
      .map(fileName => path.parse(fileName).name.split('-')[0]);
  } catch (e) {
    console.error('项目 config/paths.js 中未配置 projectConfig(项目配置文件路径), 请检查!');
    return process.exit(errorCode.NO_CONF_ERROR);
  }
};
