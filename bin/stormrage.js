#!/usr/bin/env node

'use strict';

const program = require('commander');
const packageJson = require('../package.json');

program
  .version(packageJson.version, '-v, --version')
  .command('init', '根据模板生成项目 https://github.com/gmsoft-happyCoding')
  .command('start [project]', '启动调试')
  .command('test [project]', '启动测试')
  .command('genapi [project]', '生成api代码')
  .command('genmeta [project]', '生成组件元数据')
  .command('doc [project]', '启动doc调试')
  .command('bad [project]', '编译部署')
  .alias('deploy')
  .command('devbuild [project]', '启动组件项目开发编译, 用于和app的联调')
  .command('fisinstall [components]', '使用 fis3 install 安装项目依赖')
  .alias('fi')
  .command('replace [project]', '对项目内容进行(二次)替换')
  // CI/CD新增功能 2022-12-15 16:50:46
  .command('fork <branchName> [projectPath]', '分支创建功能')
  .command('release <branchName> [projectPath]', '分支封板功能')
  .command('merge <branchName>', '分支合并功能')
  .command('make [localDir]', '打包编译产生成品库文件')

  .parse(process.argv);
