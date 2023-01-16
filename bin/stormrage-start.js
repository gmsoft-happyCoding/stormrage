#!/usr/bin/env node

const os = require('os');
const path = require('path');
const program = require('commander');
const start = require('../lib/commands/start');
const pluginOptionProcess = require('./utils/pluginOptionProcess');

program
  .argument('[project]', '（可选）要启动的本地路径，默认为当前执行目录')
  .option('-n, --next', '标识当前项目已更新为新版持续集成的方案，使用新的环境变量加载方式进行启动')
  .option('-p, --package <package>', 'react项目为mono仓库时, 指定启动的package')
  .option('--port <port>', 'react项目启动端口号, 默认 app: 3000, components: 3030')
  .option('-o, --output <path>', 'fis项目的产出目录, 默认为 D:/debug-root, macOS 下为 ~/debug-root')
  .option('-c, --clean', 'fis项目启动调试时, 先清除编译缓存')
  .option('--conf <conFileName>', '启动时使用的配置文件名称')
  .option(
    '-f, --field <field>',
    '从yml文件中注入到环境变量中的自定义配置段，CLI会将：business,hosts,gateway,\npdf-preview 这四个配置段进行注入，如果你需要额外的其他配置端，可以使用此参数指\n定，非特殊情况请将业务配置参数定义在business下，遵守字段规范，不要使用本参数\n样例（多个额外字段使用逗号进行分隔）：extra-params-a,extra-params-b'
  )
  .option('--plugin-option <json>', 'fis项目传递给插件的参数(must be a json)', pluginOptionProcess)
  .action(async (project, opts) => {
    const projectDir = project
      ? path.resolve(process.cwd(), path.normalize(project))
      : process.cwd();

    const output =
      program.output ||
      path.normalize(
        process.platform === 'darwin' ? path.resolve(os.homedir(), 'debug-root') : 'D:\\debug-root'
      );

    await start({
      projectDir,
      ...opts,
      output,
    });
  })
  .parse(process.argv);
