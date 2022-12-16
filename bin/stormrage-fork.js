#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { SvnHelper } = require('../lib/utils/SvnHelper');

program
  .argument('<branchName>', '创建的分支名称，如果已存在对应的分支，则拒绝执行，并抛出异常')
  .argument('[projectPath]', '项目根路径，可以是远程路径也可以是本地路径，自动识别', undefined)
  .option(
    '-b, --base <baseBranchesName>',
    '创建分支所使用的的原始分支名称，将在当前项目根路径（仅trunk有效）、tags、branches下同时寻找\n寻找顺序：tags -> branches -> 项目根路径'
  )
  .action(async (branchName, projectPath, baseBranchesName) => {
    try {
      // 当前项目的远端路径
      const safeProjectPath = projectPath ?? (await SvnHelper.getRootDirFromLocal());
      // 获取当前的项目根路径
      const rootDir = await SvnHelper.getProjectRootDir(safeProjectPath);
      // // 构建原始分支路径
      let originalBranchesPath = await SvnHelper.getBaseBranches(rootDir, baseBranchesName.base);
      // // 构建目标分支路径
      const newBranchesPath = await SvnHelper.getNewBranches(rootDir, branchName);
      // 执行分支创建
      await SvnHelper.fork(originalBranchesPath, newBranchesPath, branchName);

      // TODO 识别项目内存不存在Jenkinsfile，如果不存在，则创建Jenkinsfile文件，并提交

      console.log('[DONE] Fork 操作成功完成!');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);

/* 
  svn copy https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/main \
    https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/branches/current \
    -m '[Fork]增加current分支'
  
https://192.168.2.10:8080/svn/GovProEleTrade/P20高效电子交易/P2020采购执行管理/C3前端应用/政采执行管理

  */
