#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const process = require('process');
const replace = require('../lib/commands/replace');

program
  .option(
    '-c, --conf <path>',
    '指定替换内容的配置(js)文件, 返回一个 object, key 为被替换内容，value 为替换内容。eg: module.export = {"a": "b"};'
  )
  .option('-o, --output <output>', '指定替换后的项目输出位置(如果路径以.zip结尾，则会输出压缩文件)')
  .option(
    '-t, --output-type <outputType>',
    '指定输出格式 dir | zip，如果output未以.zip结尾 默认为 dir'
  )
  .parse(process.argv);

const project = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

const confPath = program.conf ? path.resolve(process.cwd(), path.normalize(program.conf)) : null;
const output = program.output ? path.resolve(process.cwd(), path.normalize(program.output)) : null;
const outputType = program.outputType || 'dir';

replace({
  project,
  confPath,
  output,
  outputType,
});
