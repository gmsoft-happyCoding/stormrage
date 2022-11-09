#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const devbuild = require('../lib/commands/devbuild');

program
  .option('--port <port>', 'react项目启动端口号, 默认 3030')
  .option('--pick', '选择需要发布的组件')
  .option('--plugin-option <json>', '传递给插件的参数(must be a json)', pluginOptionProcess)
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

devbuild({
  projectDir,
  port: program.port,
  pick: program.pick,
  pluginOption: program.pluginOption,
});
