#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const start = require('../lib/commands/start');
const pluginOptionProcess = require('./utils/pluginOptionProcess');

program
  .option('-p, --package <package>', 'react项目为mono仓库时, 指定启动的package')
  .option('--port <port>', 'react项目启动端口号, 默认 app: 3000, components: 3030')
  .option('-o, --output <path>', 'fis项目的产出目录, 默认为 D:/debug-root, macOS 下为 ~/debug-root')
  .option('-c, --clean', 'fis项目启动调试时, 先清除编译缓存')
  .option('--plugin-option <json>', 'fis项目传递给插件的参数(must be a json)', pluginOptionProcess)
  .option(
    '--env-file <fileName>',
    'react项目指定环境变量配置文件(默认为 .env), eg: .env.pro-xcj, 请设置为 --env-file pro-xcj'
  )
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

const output =
  program.output ||
  path.normalize(process.platform === 'darwin' ? '~/debug-root' : 'D:\\debug-root');

start({
  projectDir,
  package: program.package,
  port: program.port,
  output,
  clean: program.clean,
  pluginOption: program.pluginOption,
  envFile: program.envFile,
});
