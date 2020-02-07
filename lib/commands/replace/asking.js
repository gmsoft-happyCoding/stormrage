const path = require('path');
const inquirer = require('inquirer');

// 询问必要信息
async function asking(confPath, output) {
  let questions = [];

  if (!confPath) {
    questions.push({
      type: 'input',
      name: 'confPath',
      message: '请指定替换内容配置文件',
    });
  }

  if (!output) {
    questions.push({
      type: 'input',
      name: 'output',
      message: '请指定输出文件夹或zip文件名称',
    });
  }

  return inquirer.prompt(questions).then(answers => ({
    confPath: confPath || path.resolve(process.cwd(), path.normalize(answers.confPath)),
    output: output || path.resolve(process.cwd(), path.normalize(answers.output)),
  }));
}

module.exports = asking;
