#!/usr/bin/env node

const program = require('commander');
const make = require('../lib/commands/make');

program
  .argument('<env> <room>', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('-c, --package <package>', 'react项目为mono仓库时, 指定要发布的package')
  .option('-d, --dest [path]', '标识此次为本地Make，path为发布结果存放位置, 默认为<d:/发布结果>')
  .action((env, room, opts) => {})
  .parse(process.argv);
