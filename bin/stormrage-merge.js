#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { MergeHelper } = require('../lib/utils/MergeHelper');

program
  .argument(
    '<branchName>',
    '（必须）合并的分支名称，如果已不存在对应的分支，则拒绝执行，并抛出异常'
  )
  .action(async branchName => {
    try {
      // 获取项目的远端路径
      const safeProjectPath = await MergeHelper.getRootDirFromLocal();
      // 获取当前的项目远端根路径
      const rootDir = await MergeHelper.getProjectRootDir(safeProjectPath);
      // 构建合并的目标分支路径
      let originalBranchesPath = await MergeHelper.getBaseBranches(rootDir, branchName);

      // 执行合并
      const result = await MergeHelper.merge(originalBranchesPath);
      console.log('result: ', result);

      console.log('[DONE] Merge 操作成功完成!');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);
