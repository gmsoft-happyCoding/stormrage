const fs = require('fs-extra');
const inquirer = require('inquirer');
const { isProject, isMonoProject } = require('../../project-info/isProject');
const { packageType, isProjectPackage } = require('../../project-info/packageType');
const deployInfo = require('../../deployInfo');

// 询问生成项目的必要信息
async function asking(projectDir, package) {
  let questions = [];

  if (!isProject(projectDir)) {
    questions.push({
      type: 'input',
      name: 'projectDir',
      message: '请指定要发布项目的根目录?',
      validate: value => (isProject(value) ? true : '该目录没有package.json, 请重新指定!'),
    });
  }

  if (isMonoProject(projectDir) && !isProjectPackage(package)) {
    questions.push({
      type: 'list',
      name: 'package',
      message: '请选择目标子项目?',
      choices: [packageType.APP, packageType.COMPONENTS],
    });
  }

  return inquirer.prompt(questions).then(answers => ({
    ...answers,
    projectDir: answers.projectDir || projectDir,
    package: answers.package || package,
  }));
}

module.exports = asking;
