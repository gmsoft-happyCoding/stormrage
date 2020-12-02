const fs = require('fs');
const path = require('path');
const errorCode = require('../../errorCode');

module.exports = () => {
  try {
    return fs
      .readdirSync(path.resolve('.', 'project-conf', 'media'))
      .filter(fileName => /.*-.*/.test(fileName))
      .map(fileName => path.parse(fileName).name.split('-')[0]);
  } catch (e) {
    console.error(
      `没有找到项目配置文件目录 ${path.resolve('.', 'project-conf', 'media')}, 请检查!`
    );
    return process.exit(errorCode.NO_CONF_ERROR);
  }
};
