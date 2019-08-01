#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const bad = require('../lib/commands/bad');

program
  .option('-p, --package <package>', '项目为mono仓库时, 指定启动的package')
  .option('-d, --dest <path>', '发布结果存放位置, 默认为<d:/发布结果>')
  .option('--no-doc', '不生成组件文档')
  .option('--pick', '选择需要发布的组件, 组件项目有效')
  .option('--svn <url>', '通过svn url指定需要发布的项目')
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

const destDir = program.dest || path.normalize('D:\\发布结果');

bad({ projectDir, package: program.package, destDir, program });
