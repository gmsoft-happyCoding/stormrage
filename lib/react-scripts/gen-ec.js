/**
 * 生成导出组件 map
 */
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { pick, isEmpty } = require('lodash');
const { configResolve } = require('./utils/path-resolve');
const exportComponents = require(configResolve('exportComponents'));

function genEC(needPick) {
  return new Promise(resolve => {
    const questions = [
      {
        type: 'checkbox',
        name: 'pickComponents',
        message: `请选择你想要${process.env.NODE_ENV === 'development' ? '调试' : '发布'}的组件?`,
        choices: Object.keys(exportComponents),
        pageSize: 10,
        validate: pickComponents => {
          if (isEmpty(pickComponents)) return '请选择要发布的组件';
          return true;
        },
      },
    ];

    inquirer.prompt(questions).then(({ pickComponents }) => {
      const _exportComponents = pick(exportComponents, pickComponents);
      // 保存为全局变量, webpack的配置文件中会用到
      global.PICK_EXPORT_COMPONENTS = _exportComponents;
      resolve(_exportComponents);
    });
  });
}

module.exports = genEC;
