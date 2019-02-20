const TEMPLATE_TYPE = require("./templateType");
const projectRoot = require("./projectRoot");
const asking = require("./asking");
const downloadRepo = require("./downloadRepo");
const replaceTemplateVars = require("./replaceTemplateVars");
const install = require("./install");
const updateHosts = require("./updateHosts");
const closing = require("./closing");
const start = require("./start");

async function init(startProject) {
  // 获取必要信息
  const answers = await asking();

  const { templateType, ...vars } = answers;

  // 项目目录名称
  const projectDir =
    templateType === TEMPLATE_TYPE.COMPONENTS
      ? `${vars.projectName}-components`
      : vars.projectName;

  // 下载模板
  await downloadRepo(templateType, projectDir);

  // 替换变量
  replaceTemplateVars(projectDir, vars);

  // 安装依赖
  install(projectDir);

  // 更新hosts文件
  await updateHosts();

  // 项目生成结束
  closing();

  // 启动项目
  if (startProject) start(projectDir, templateType);
}

module.exports = init;
