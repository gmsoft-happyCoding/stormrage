#!/usr/bin/env node

const program = require('commander');
const { SvnHelper } = require('../lib/utils/SvnHelper');

program
  .argument('<branchName>', '创建的分支名称，如果已存在对应的分支，则拒绝执行，并抛出异常')
  .argument('[projectPath]', '项目根路径，可以是远程路径也可以是本地路径，自动识别', undefined)
  .action((branchName, projectPath) => {
    // 获取当前的项目根路径
    SvnHelper.getProjectRootDir(
      projectPath ??
        'https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/branches'
    ).then(rootDir => {
      console.log('rootDir: ', rootDir);
    });
  })
  .parse(process.argv);

/* 
  svn copy https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/main \
    https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/branches/current \
    -m '[Fork]增加current分支'
  
  */
