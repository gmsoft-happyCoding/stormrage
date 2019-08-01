const fs = require('fs-extra');
const inquirer = require('inquirer');
const { isProject, isMonoProject } = require('../../projectInfo/isProject');
const { packageType, isProjectPackage } = require('../../projectInfo/packageType');
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
      message: '你想要发布哪个子项目?',
      choices: [packageType.APP, packageType.COMPONENTS],
    });
  }

  questions.push({
    type: 'list',
    name: 'env',
    message: '你想要发布到哪个环境?',
    choices: await deployInfo.getEnvs(),
  });

  questions.push({
    type: 'list',
    name: 'room',
    message: '你想要发布到哪个机房?',
    choices: async function({ env }) {
      return await deployInfo.getRooms(env);
    },
  });

  return inquirer.prompt(questions).then(answers => ({
    ...answers,
    projectDir: answers.projectDir || projectDir,
    package: answers.package || package,
  }));
}

module.exports = asking;
