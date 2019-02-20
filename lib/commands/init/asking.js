const inquirer = require("inquirer");
const TEMPLATE_TYPE = require("./templateType");

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

module.exports = asking;
