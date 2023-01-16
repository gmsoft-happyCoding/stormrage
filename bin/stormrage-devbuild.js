#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const devbuild = require('../lib/commands/devbuild');

program
  .argument('[project]', '（可选）要启动的本地路径，默认为当前执行目录')
  .option('--port <port>', 'react项目启动端口号, 默认 3030')
  .option('--pick', '选择需要发布的组件')
  .option('-n, --next', '标记当前使用新的配置加载模式')
  .option('--conf <conFileName>', '启动时使用的配置文件名称')
  .option('--plugin-option <json>', '传递给插件的参数(must be a json)', pluginOptionProcess)
  .action(async (project, opts = {}) => {
    const projectDir = project
      ? path.resolve(process.cwd(), path.normalize(project))
      : process.cwd();
    await devbuild({
      projectDir,
      ...opts,
    });
  })
  .parse(process.argv);
