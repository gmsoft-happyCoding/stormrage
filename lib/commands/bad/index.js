const path = require('path');
const process = require('process');
const asking = require('./asking');
const getProjectRoot = require('../../projectInfo/getProjectRoot');
const { packageType } = require('../../projectInfo/packageType');
const { isComponentsProject, isFisProject } = require('../../projectInfo/isProject');
const fetchProject = require('../../utils/fetchProject');

async function bad({ projectDir, destDir, program }) {
  // svn参数优先
  let dir = program.svn ? await fetchProject(program.svn, program.svnCheckout) : projectDir;

  // 询问必要信息
  const answers = await asking(dir, program.package, program.env, program.room);

  // 获取项目根目录
  const projectRoot = getProjectRoot(answers.projectDir, answers.package);

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  if (isFisProject(projectRoot)) {
    // fis
    require('../../fis-scripts/build-and-deploy')({
      ...answers,
      destDir,
      pluginOption: program.pluginOption,
    });
  } else {
    // 加载构建发布脚本
    const buildAndDeploy = require('../../react-scripts/build-and-deploy');

    buildAndDeploy({
      ...answers,
      destDir,
      program,
      isComponentsProject:
        isComponentsProject(projectRoot) || answers.package === packageType.COMPONENTS,
    });
  }
}

module.exports = bad;
