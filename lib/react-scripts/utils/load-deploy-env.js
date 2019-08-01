process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const { configResolve } = require('./path-resolve');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const paths = require(configResolve('paths'));

// 环境变量配置文件
const envFiles = fs.readdirSync(path.dirname(paths.dotenv));
// 可以使用的配置文件
const configs = envFiles.filter(file => file.includes('.env.')).map(file => file.split('.')[2]);

/**
 * 加载配置文件中的配置到 process.env
 * @param {string} whichDeploy - 发布目标环境
 */
function loadEnvFile(whichDeploy) {
  // 设置标识, 确定使用哪一个配置文件
  process.env.DEPLOY_ENV = whichDeploy;
  // 加载配置文件, 配置到 process.env
  return require(configResolve('env'));
}

function load(whichDeploy) {
  /**
   * 从参数中获取了有效的(同名的)目标名称直接使用
   * 否则询问使用哪个环境配置?
   */
  return new Promise((resolve, reject) => {
    if (whichDeploy && configs.includes(whichDeploy)) {
      resolve(loadEnvFile(whichDeploy)().raw);
    } else {
      console.log(chalk.red(`没项目中没有同名的环境配置文件${whichDeploy}, 请检查 env 目录!`));
      return reject();
      // 暂时不允许配置文件名称不一致
      // if (configs.length === 0) {
      //   console.log(chalk.red("没有可供发布的目标环境配置, 请检查 env 目录!"));
      //   return reject();
      // }
      // const questions = [
      //   {
      //     type: "list",
      //     name: "config",
      //     message: `项目中没有同名的环境配置文件${whichDeploy}, 请手动选择!`,
      //     choices: configs
      //   }
      // ];

      // inquirer.prompt(questions).then(answers => {
      //   resolve(loadEnvFile(answers.config)().raw);
      // });
    }
  });
}

module.exports = load;
