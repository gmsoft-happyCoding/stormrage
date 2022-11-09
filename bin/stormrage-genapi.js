#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const genapi = require('../lib/commands/genapi');

program
  .option('-p, --package <package>', '项目为mono仓库时, 指定需要生成api代码的package')
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

genapi({ projectDir, package: program.package });
