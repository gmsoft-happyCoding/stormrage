#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const process = require('process');
const fisinstall = require('../lib/commands/fisinstall');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('-r, --root <project>', '指定项目根目录')
  .action(async (pwdDir, opts) => {
    try {
      const components = pwdDir;
      fisinstall({ projectDir: opts.root || process.cwd(), components });
    } catch (error) {
      console.error('[ERROR]: %s\nStack:%s', error.stack);
      process.exit(1);
    }
  })
  .parse(process.argv);
