const child_process = require("child_process");

function hasYarn() {
  try {
    child_process.execSync("yarn --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = hasYarn;
