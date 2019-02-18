const fs = require("fs");

// 检测文件或者文件夹存在
function fsExistsSync(path) {
  try {
    fs.accessSync(path, fs.F_OK);
  } catch (e) {
    return false;
  }
  return true;
}

module.exports = fsExistsSync;
