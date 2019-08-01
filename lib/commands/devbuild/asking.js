const fs = require('fs-extra');
const inquirer = require('inquirer');
const { isProject } = require('../../projectInfo/isProject');
const { packageType } = require('../../projectInfo/packageType');

// 询问生成项目的必要信息
function asking(projectDir) {
  let questions = [];

  if (!isProject(projectDir)) {
    questions.push({
      type: 'input',
      name: 'projectDir',
      message: '请指定要编译项目的根目录?',
      validate: value => (isProject(value) ? true : '该目录没有package.json, 请重新指定!'),
    });
  }

  return inquirer.prompt(questions).then(answers => ({
    projectDir: answers.projectDir || projectDir,
  }));
}

module.exports = asking;
