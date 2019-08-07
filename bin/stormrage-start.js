#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const start = require('../lib/commands/start');

program
  .option('-p, --package <package>', 'react项目为mono仓库时, 指定启动的package')
  .option('--port <port>', 'react项目启动端口号, 默认 app: 3000, components: 3030')
  .option('-o, --output <path>', 'fis项目的产出目录, 默认为 D:/debug-root, macOS 下为 ~/debug-root')
  .option('-c, --clean', 'fis项目启动调试时, 先清除编译缓存')

  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

const output =
  program.output ||
  path.normalize(process.platform === 'darwin' ? '~/debug-root' : 'D:\\debug-root');

start({ projectDir, package: program.package, port: program.port, output, clean: program.clean });
