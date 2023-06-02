#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const genmeta = require('../lib/commands/genmeta');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('--pick', '选择需要提取元数据的组件')
  .action(async (pwdDir, opts) => {
    try {
      const projectDir = pwdDir ? pwdDir : process.cwd();

      genmeta({
        projectDir,
        pick: opts.pick,
      });
    } catch (error) {
      console.error('[ERROR]: %s\nStack:%s', error.stack);
      process.exit(1);
    }
  })
  .parse(process.argv);
