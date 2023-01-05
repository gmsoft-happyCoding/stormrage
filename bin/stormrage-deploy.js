#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');
const deploy = require('../lib/commands/deploy');

program
  .argument('<env>', '（必须）部署的目标环境')
  .argument('<room>', '（必须）部署的目标机房')
  .option(
    '-c, --conf <configFileName>',
    '明确指定部署所属使用的配置文件名，带不带后缀不关紧要，CLI将尽可能去寻找'
  )
  .option(
    '-d, --dest [path]',
    '标识此次部署为本地部署，path为发布结果存放位置, 默认为<d:/发布结果>，不传递则尝试根据相关配置进行上传'
  )
  .action(async (env, room, opts) => {
    console.log('env: ', env);
    console.log('room: ', room);
    console.log('opts: ', opts);
    try {
      await deploy();
      console.log('[DONE] Deploy 操作成功完成！');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);
