const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const download = require("download-git-repo");
const inquirer = require("inquirer");
const chalk = require("chalk");
const walker = require("fs-walker");
const hasYarn = require("../utils/hasYarn");
const fsExistsSync = require("../utils/fsExistsSync");
const replaceVars = require("../utils/replaceVars");

replaceVars;

// 模板类型
const TEMPLATE_TYPE = {
  APP: "app",
  COMPONENTS: "components",
  MONO: "mono"
};

function projectRoot(projectDir) {
  return path.join(process.cwd(), projectDir);
}

// 询问生成项目的必要信息
function asking() {
  const questions = [
    {
      type: "list",
      name: "templateType",
      message: "你想要新建哪种项目?",
      choices: [
        TEMPLATE_TYPE.APP,
        TEMPLATE_TYPE.COMPONENTS,
        {
          name: `${
            TEMPLATE_TYPE.MONO
          } ( 包含主应用和组件子项目, https://en.wikipedia.org/wiki/Monorepo )`,
          value: TEMPLATE_TYPE.MONO
        }
      ]
    },
    {
      type: "input",
      name: "projectName",
      message: "项目名称(只能使用 小写字母 和 -)?",
      transformer: (input, answers) => {
        if (!input) return "";
        return answers.templateType === TEMPLATE_TYPE.COMPONENTS
          ? `${input}-components`
          : input;
      },
      validate: value =>
        value && /^([a-z]+[-]?[a-z]+)*$/.test(value)
          ? true
          : "项目名称至少包含2个字符且只能包含 小写字母 和 -, 不能以 - 开头或结尾"
    },
    {
      type: "input",
      name: "projectTitle",
      message: "项目标题(设置html的title)?",
      when: answers =>
        answers.templateType === TEMPLATE_TYPE.APP ||
        answers.templateType === TEMPLATE_TYPE.MONO
    },
    {
      type: "input",
      name: "projectDescription",
      message: "项目描述(设置html的description, 用于搜索引擎检索)?",
      when: answers =>
        answers.templateType === TEMPLATE_TYPE.APP ||
        answers.templateType === TEMPLATE_TYPE.MONO
    }
  ];

  return inquirer.prompt(questions);
}

// 下载模板
function downloadRepo(templateType, projectDir) {
  console.log(chalk.magenta("开始下载模板..."));
  return new Promise((resolve, reject) => {
    download(
      `github:gmsoft-happyCoding/react-${templateType}-template`,
      projectDir,
      err => {
        if (err) console.error(err);
        else console.log(chalk.magenta("下载完成"));
        resolve();
      }
    );
  });
}

// 替换模板中的变量
function replaceTemplateVars(projectDir, vars) {
  console.log(chalk.magenta("开始替换模板变量..."));
  console.log(JSON.stringify(vars, null, 2));
  var filter = {
    file: function(stats) {
      return !/(node_modules|\.(ico|png|jpg|lock)$)/i.test(stats.fullname);
    }
  };
  walker.files.sync(projectRoot(projectDir), filter).forEach(function(stats) {
    const fileContent = fs.readFileSync(stats.fullname, {
      encoding: "utf8"
    });
    fs.writeFileSync(stats.fullname, replaceVars(fileContent, vars));
  });
  console.log(chalk.magenta("替换模板变量完成"));
}

// 安装依赖
function install(projectDir) {
  if (!hasYarn) {
    console.log(
      chalk.yellow(
        "请安装 yarn (https://yarnpkg.com/zh-Hans/docs/install#windows-stable).\n然后在项目根目录执行命令 yarn 安装项目所需依赖."
      )
    );
    return;
  }

  const root = projectRoot(projectDir);
  const node_modules = path.join(root, "node_modules");
  if (fsExistsSync(node_modules)) return;
  console.log(chalk.magenta("安装项目所需依赖..."));
  child_process.execSync("yarn", {
    stdio: "inherit",
    cwd: root
  });
}

function closing() {
  console.log(chalk.magenta("Done\nHappy hacking!"));
}

// 启动项目
function start(projectDir, templateType) {
  const root = projectRoot(projectDir);
  // 启动vs code
  try {
    child_process.execSync("code .", { cwd: root });
  } catch (e) {
    // do nothing
  }
  // 启动项目
  child_process.execSync(
    templateType === TEMPLATE_TYPE.MONO ? "yarn start:c" : "yarn start",
    { stdio: "inherit", cwd: root }
  );
}

async function init(startProject) {
  // 获取必要信息
  const answers = await asking();

  const { templateType, ...vars } = answers;

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

  // 项目生成结束
  closing();

  // 启动项目
  if (startProject) start(projectDir, templateType);
}

module.exports = init;
