#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const doc = require('../lib/commands/doc');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('-p, --package <package>', '项目为mono仓库时, 指定启动的package')
  .option('-b, --build', '编译构建产出文档目录')
  .option('--env <deployEnv>', '指定发布目标环境')
  .option('--room <deployRoom>', '指定发布目标机房')
  .option('--plugin-option <json>', '传递给插件的参数(must be a json)', pluginOptionProcess)
  .action(async (pwdDir, opts) => {
    try {
      const projectDir = pwdDir ? pwdDir : process.cwd();

      doc({
        projectDir,
        package: opts.package,
        isBuildMode: !!opts.build,
        env: opts.env,
        room: opts.room,
        pluginOption: opts.pluginOption,
      });
    } catch (error) {
      console.error('[ERROR]: %s\nStack:%s', error.stack);
      process.exit(1);
    }
  })
  .parse(process.argv);
