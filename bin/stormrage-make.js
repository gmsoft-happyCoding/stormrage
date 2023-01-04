#!/usr/bin/env node

const yaml = require('js-yaml');
const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');

program
  .action(async () => {
    try {
      console.log('[DONE] Make 操作成功完成!');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);

  // https://192.168.2.10:8080/svn/GovProEleTrade/conf