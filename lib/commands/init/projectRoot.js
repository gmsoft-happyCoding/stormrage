const process = require("process");
const path = require("path");

// 获取项目根目录
function projectRoot(projectDir) {
  return path.join(process.cwd(), projectDir);
}

module.exports = projectRoot;
