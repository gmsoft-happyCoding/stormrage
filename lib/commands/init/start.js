const child_process = require("child_process");
const TEMPLATE_TYPE = require("./templateType");
const projectRoot = require("./projectRoot");

// 启动
function start(projectDir, templateType) {
  const root = projectRoot(projectDir);
  // 启动vs code
  try {
    child_process.execSync("code .", { cwd: root });
  } catch (e) {
    // do nothing
  }
  // 启动项目
  child_process.execSync(
    templateType === TEMPLATE_TYPE.MONO ? "yarn start:c" : "yarn start",
    { stdio: "inherit", cwd: root }
  );
}

module.exports = start;
