#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');
const deploy = require('../lib/commands/deploy');

program
  .argument(
    '<projectName>',
    '（必须）部署的成品项目名称，前端很多项目都是复合项目，成品库一般都有前后缀名，请注意核对名称正确性'
  )
  .argument('<env>', '（必须）部署的目标环境')
  .argument('<room>', '（必须）部署的目标机房')
  .option(
    '-t, --target <targetVersion>',
    '明确指定部署所使用的成品版本，不传递，则使用最新的Latest版本'
  )
  .option(
    '-c, --conf <configFileName>',
    '明确指定部署所使用的配置文件名，带不带后缀无关紧要，CLI将尽可能去寻找'
  )
  .option('-cl, --confLabel <label>', '明确指定部署所使用的配置文件名的附加标签，默认为：1')
  .option(
    '-d, --dest [path]',
    '标识此次部署为本地部署，path为发布结果存放位置, 默认为<d:/发布结果>，不传递则尝试根据相关配置进行上传'
  )
  .action(async (projectName, env, room, opts) => {
    try {
      await deploy({ projectName, env, room, opts });
      console.log('[DONE] Deploy 操作成功完成！');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);
