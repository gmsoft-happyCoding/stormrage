#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const devbuild = require('../lib/commands/devbuild');

program
  .option('--port <port>', 'react项目启动端口号, 默认 3030')
  .option('--pick', '选择需要发布的组件, 组件项目有效')
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

devbuild({ projectDir, port: program.port, pick: program.pick });
