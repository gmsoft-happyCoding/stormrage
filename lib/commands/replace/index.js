const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const process = require('process');
const unzip = require('../../utils/doUnzip');
const asking = require('./asking');
const doReplace = require('./do-replace/index');

// macos 平台会解压到指定路径的项目同名文件夹下，而其他平台不会创建此目录
function getProjectRoot(tempDir, project) {
  if (process.platform === 'darwin') return path.join(tempDir, path.parse(project).name);
  else return tempDir;
}

async function replace({ project, confPath, output, outputType }) {
  const projectIsZip = project.endsWith('.zip');

  const tempDir = path.join(os.tmpdir(), 'stormrage-replace-source');

  // 解压项目到临时目录
  if (projectIsZip) {
    fs.emptyDirSync(tempDir);
    await unzip(project, tempDir);
  }

  // 询问必要信息 confPath, output
  const answers = await asking(confPath, output);

  // 获取项目根目录
  const projectRoot = projectIsZip ? getProjectRoot(tempDir, project) : project;

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  doReplace({ ...answers, outputType });
}

module.exports = replace;
