#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');
const showEnv = require('../lib/commands/env');

program
  .argument('[localDir]', '（可选）目标项目本地路径，默认为当前执行目录')
  .option('-r, --room <room>', '目标机房，不传递，则尝试获取所有机房的配置')
  .option(
    '-e, --env <env>',
    '打包所使用的环境变量参考哪个环境去构建，目前默认使用test1的环境变量去构建\n如果有特殊需求，需要使用其他环境的配置进行构建可以使用此参数指定，\n一般情况下请遵守相关规范创建test1的环境变量配置，不要使用本参数'
  )
  .option('-p, --package <package>', 'react项目为mono仓库时, 指定子项目类型')
  .option(
    '-c, --conf <conf>',
    '直接指定使用的环境变量yml文件名称（对yml后缀名不敏感，自适配），如果有特殊情况，\n需要指定配置文件名称，可以使用此参数进行配置，比如同项目发布到私有机房的定制化\n版本，除此之外请遵守配置文件命名规范，不要使用本参数'
  )
  .option(
    '-f, --field <field>',
    '额外从yml文件中注入到环境变量中的自定义配置段，CLI会将：business,hosts,gateway,\npdf-preview 这四个配置段进行注入，如果你需要额外的其他配置端，可以使用此参数指\n定，非特殊情况请将业务配置参数定义在business下，遵守字段规范，不要使用本参数\n样例（多个额外字段使用逗号进行分隔）：extra-params-a,extra-params-b'
  )
  .action(async (localDir, opts = { env: 'test1' }) => {
    try {
      await showEnv({
        localDir,
        opts,
      });
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'env'));
    }
  })
  .parse(process.argv);
