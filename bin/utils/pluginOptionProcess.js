const errorCode = require('../../lib/errorCode');

function pluginOptionProcess(option) {
  try {
    return JSON.parse(option);
  } catch (e) {
    console.error('解析 plugin-option 失败, 请检查校验是否是合法的json字符串');
    process.exit(errorCode.PLUGIN_OPTION_ERROR);
  }
}

module.exports = pluginOptionProcess;
