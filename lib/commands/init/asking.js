const inquirer = require('inquirer');
const TEMPLATE_TYPE = require('./templateType');

// 询问生成项目的必要信息
async function asking(templateRepo) {
  const questions = [
    {
      type: 'list',
      name: 'templateType',
      message: '你想要新建哪种项目?',
      choices: [
        TEMPLATE_TYPE.APP,
        TEMPLATE_TYPE.COMPONENTS,
        {
          name: `${TEMPLATE_TYPE.MONO} ( 包含主应用和组件子项目, https://en.wikipedia.org/wiki/Monorepo )`,
          value: TEMPLATE_TYPE.MONO,
        },
      ],
      // 如果是自定义模板, 不需要选择项目类型
      when: () => !templateRepo,
    },
    {
      type: 'input',
      name: 'projectName',
      message: '项目名称(只能使用 小写字母 和 -)?',
      transformer: (input, answers) => {
        if (!input) return '';
        return answers.templateType === TEMPLATE_TYPE.COMPONENTS ? `${input}-components` : input;
      },
      validate: value =>
        value && /^([a-z]+[0-9]*[-]?[a-z0-9]+)*$/.test(value)
          ? true
          : '项目名称至少包含2个字符且只能包含 小写字母, 数字 和 -, 不能以 - 开头或结尾, 不能以数字开头',
    },
    {
      type: 'input',
      name: 'projectTitle',
      message: '项目标题(设置html的title)?',
      when: answers =>
        answers.templateType === TEMPLATE_TYPE.APP ||
        answers.templateType === TEMPLATE_TYPE.MONO ||
        templateRepo,
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: '项目描述(设置html的description, 用于搜索引擎检索)?',
      when: answers =>
        answers.templateType === TEMPLATE_TYPE.APP ||
        answers.templateType === TEMPLATE_TYPE.MONO ||
        templateRepo,
    },
  ];

  const answers = await inquirer.prompt(questions);

  // 项目部署名称（React单App项目时起作用，此处的参数在模板项目中会有占位，配合完成替换）
  answers.projectDeployName = answers.projectName;
  // 项目部署名称（React复合项目时对App子项目项目起作用，此处的参数在模板项目中会有占位，配合完成替换）
  answers.projectDeployNameApp = `${answers.projectName}-app`;
  // 项目部署名称（React复合项目时对Components子项目项目起作用，此处的参数在模板项目中会有占位，配合完成替换）
  answers.projectDeployNameComponents = `${answers.projectName}-components`;

  return answers;
}

module.exports = asking;
