const fs = require("fs-extra");
const inquirer = require("inquirer");
const { isProject, isMonoProject } = require("../../projectInfo/isProject");
const {
  packageTypeOptions,
  isValid
} = require("../../projectInfo/packageType");

// 询问生成项目的必要信息
function asking(projectDir, package) {
  let questions = [];

  if (!isProject(projectDir)) {
    questions.push({
      type: "input",
      name: "projectDir",
      message: "请指定要生成api代码项目的根目录?",
      validate: value =>
        isProject(value) ? true : "该目录没有package.json, 请重新指定!"
    });
  }

  if (isMonoProject(projectDir) && !isValid(package)) {
    questions.push({
      type: "list",
      name: "package",
      message: "你想要生成哪个子项目的api代码?",
      choices: packageTypeOptions
    });
  }

  return inquirer.prompt(questions).then(answers => ({
    projectDir: answers.projectDir || projectDir,
    package: answers.package || package
  }));
}

module.exports = asking;
