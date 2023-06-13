#!/usr/bin/env node

'use strict';

const program = require('commander');
const init = require('../lib/commands/init');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');

program
  .option('-s, --no-start', '生成后不自动启动项目')
  .option('-r, --repository-owner <repositoryOwner>', '模板所在仓库前缀 eg: gitlab:angular-moon')
  .option(
    '-t, --template-repo <templateRepo>',
    '自定义的模板地址(自定义模板不能改变项目配置文件的目录结构), 地址格式参考: https://www.npmjs.com/package/download-git-repo'
  )
  .action(async opts => {
    try {
      await init(opts.start, opts.repositoryOwner, opts.templateRepo);
    } catch (error) {
      console.error(
        '[ERROR]: %s\nStack:%s',
        ErrorHelper.getErrorMessage(error.message, 'make'),
        error.stack
      );
      process.exit(1);
    }
  })
  .parse(process.argv);
