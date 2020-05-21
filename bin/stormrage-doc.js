#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const doc = require('../lib/commands/doc');

program
  .option('-p, --package <package>', '项目为mono仓库时, 指定启动的package')
  .option('-b, --build', '编译构建产出文档目录')
  .option('--env <deployEnv>', '指定发布目标环境')
  .option('--room <deployRoom>', '指定发布目标机房')
  .option('--plugin-option <json>', '传递给插件的参数(must be a json)', pluginOptionProcess)
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

doc({
  projectDir,
  package: program.package,
  isBuildMode: !!program.build,
  env: program.env,
  room: program.room,
  pluginOption: program.pluginOption,
});
