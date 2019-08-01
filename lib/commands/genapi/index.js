const path = require("path");
const process = require("process");
const child_process = require("child_process");
const asking = require("./asking");
const getProjectRoot = require("../../projectInfo/getProjectRoot");

const { nodeModuleResolve } = require("../../react-scripts/utils/path-resolve");

async function genapi({ projectDir, package }) {
  const answers = await asking(projectDir, package);

  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  child_process.execSync(
    `npx ${nodeModuleResolve(".bin", "easymock")} init .`,
    {
      stdio: "inherit",
      cwd: projectRoot
    }
  );
}

module.exports = genapi;
