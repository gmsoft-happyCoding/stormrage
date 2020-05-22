const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { isProject, isMonoProject } = require('../../project-info/isProject');
const { packageType, isProjectPackage } = require('../../project-info/packageType');
const deployInfo = require('../../deployInfo');
const { intersection } = require('lodash');
const errorCode = require('../../errorCode');

// 询问要发布的环境和机房
async function asking(env, room, projectEnvs, projectRooms) {
  let questions = [];

  const intersectionEnvs = intersection(await deployInfo.getEnvs(), projectEnvs);
  if (intersectionEnvs.length === 0) {
    console.log(chalk.red('项目配置文件指定的发布环境和部署配置信息不符, 请检查!'));
    process.exit(errorCode.NO_CONF_ERROR);
  }

  if (!env) {
    questions.push({
      type: 'list',
      name: 'env',
      message: '你想要发布到哪个环境?',
      choices: intersectionEnvs,
    });
  }

  if (!room) {
    questions.push({
      type: 'list',
      name: 'room',
      message: '你想要发布到哪个机房?',
      choices: async function(answers) {
        const intersectionRooms = intersection(
          await deployInfo.getRooms(answers.env || env),
          projectRooms
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
    env: answers.env || env,
    room: answers.room || room,
  }));
}

module.exports = asking;
