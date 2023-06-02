#!/usr/bin/env node

const program = require('commander');
const genapi = require('../lib/commands/genapi');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('-p, --package <package>', '项目为mono仓库时, 指定需要生成api代码的package')
  .action(async (pwdDir, opts) => {
    try {
      const projectDir = pwdDir ? pwdDir : process.cwd();

      genapi({ projectDir, package: opts.package });
    } catch (error) {
      console.error('[ERROR]: %s\nStack:%s', error.stack);
      process.exit(1);
    }
  })
  .parse(process.argv);
