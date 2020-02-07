const { sortBy } = require('lodash');
const errorCode = require('../../../errorCode');

module.exports = confPath => {
  try {
    const rawConfig = require(confPath);
    const keys = Object.keys(rawConfig);
    const config = keys.map(key => ({ from: key, to: rawConfig[key] }));

    // 按照被替换内容长度排倒序
    return sortBy(config, [
      function({ from }) {
        return -from.length;
      },
    ]);
  } catch (e) {
    console.error('加载配置文件失败');
    process.exit(errorCode.CONF_ERROR);
  }
};
