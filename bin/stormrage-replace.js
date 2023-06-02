#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const process = require('process');
const replace = require('../lib/commands/replace');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option(
    '-c, --conf <path>',
    '指定替换内容的配置(js)文件, 返回一个 object, key 为被替换内容，value 为替换内容。eg: module.export = {"a": "b"};'
  )
  .option('-o, --output <output>', '指定替换后的项目输出位置(如果路径以.zip结尾，则会输出压缩文件)')
  .option(
    '-t, --output-type <outputType>',
    '指定输出格式 dir | zip，如果output未以.zip结尾 默认为 dir'
  )
  .action(async (pwdDir, opts) => {
    try {
      const project = pwdDir ? pwdDir : process.cwd();

      const confPath = opts.conf ? path.resolve(process.cwd(), path.normalize(opts.conf)) : null;
      const output = opts.output ? path.resolve(process.cwd(), path.normalize(opts.output)) : null;
      const outputType = opts.outputType || 'dir';

      replace({
        project,
        confPath,
        output,
        outputType,
      });
    } catch (error) {
      console.error('[ERROR]: %s\nStack:%s', error.stack);
      process.exit(1);
    }
  })
  .parse(process.argv);
