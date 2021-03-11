const TEMPLATE_TYPE = require('./templateType');
const projectRoot = require('./projectRoot');
const asking = require('./asking');
const downloadRepo = require('./downloadRepo');
const replaceTemplateVars = require('./replaceTemplateVars');
const install = require('./install');
const updateHosts = require('./updateHosts');
const closing = require('./closing');
const start = require('./start');

async function init(startProject, repositoryOwner, templateRepo) {
  // 获取必要信息
  const answers = await asking(templateRepo);

  const { templateType, ...vars } = answers;

  // 项目目录名称
  const projectDir =
    templateType === TEMPLATE_TYPE.COMPONENTS ? `${vars.projectName}-components` : vars.projectName;

  // 下载模板
  await downloadRepo(templateType, projectDir, repositoryOwner, templateRepo);

  // 替换变量
  replaceTemplateVars(projectDir, vars);

  // 安装依赖
  install(projectDir);

  // 更新hosts文件
  updateHosts();

  // 项目生成结束
  closing();

  // 启动项目, 自定义模板不会自动启动项目(因为不知道启动命令)
  if (startProject && !templateRepo) start(projectDir, templateType);
}

module.exports = init;
