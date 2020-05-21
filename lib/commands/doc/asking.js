const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { intersection } = require('lodash');
const { isProject, isMonoProject } = require('../../project-info/isProject');
const { packageType, isProjectPackage } = require('../../project-info/packageType');
const deployInfo = require('../../deployInfo');

// 询问生成项目的必要信息
async function asking(projectDir, package, isBuildMode, env, room) {
  let questions = [];

  const intersectionEnvs = intersection(
    await deployInfo.getEnvs(),
    require('../../react-scripts/utils/get-project-envs')()
  );
  if (intersectionEnvs.length === 0) {
    console.log(chalk.red('项目配置文件指定的发布环境和部署配置信息不符, 请检查!'));
    process.exit(errorCode.NO_CONF_ERROR);
  }

  if (!isProject(projectDir)) {
    questions.push({
      type: 'input',
      name: 'projectDir',
      message: '请指定要调试项目的根目录?',
      validate: value => (isProject(value) ? true : '该目录没有package.json, 请重新指定!'),
    });
  }

  if (isMonoProject(projectDir) && !isProjectPackage(package)) {
    questions.push({
      type: 'list',
      name: 'package',
      message: '你想要调试哪个子项目?',
      choices: [packageType.APP, packageType.COMPONENTS],
    });
  }

  if (isBuildMode && !env) {
    questions.push({
      type: 'list',
      name: 'env',
      message: '你想要发布到哪个环境?',
      choices: intersectionEnvs,
    });
  }

  if (isBuildMode && !room) {
    questions.push({
      type: 'list',
      name: 'room',
      message: '你想要发布到哪个机房?',
      choices: async function({ env }) {
        const intersectionRooms = intersection(
          await deployInfo.getRooms(env),
          require('../../react-scripts/utils/get-project-rooms')()
        );
        if (intersectionRooms.length === 0) {
          console.log(chalk.red('项目配置文件指定的发布机房和部署配置信息不符, 请检查!'));
          return process.exit(errorCode.NO_CONF_ERROR);
        }
        return intersectionRooms;
      },
    });
  }

  return inquirer.prompt(questions).then(answers => ({
    ...answers,
    projectDir: answers.projectDir || projectDir,
    package: answers.package || package,
    env: answers.env || env,
    room: answers.room || room,
  }));
}

module.exports = asking;
