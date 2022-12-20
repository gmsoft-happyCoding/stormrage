#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { SvnHelper } = require('../lib/utils/SvnHelper');

program
  .argument('<branchName>', '（必须）创建的分支名称，如果已存在对应的分支，则拒绝执行，并抛出异常')
  .argument(
    '[projectPath]',
    '（可选）项目路径（可以是项目子目录），可以是远程路径也可以是本地路径，自动识别；\n如果不传递，则默认为当前工作目录："./"',
    undefined
  )
  .option(
    '-b, --base <baseBranchesName>',
    '创建分支所使用的的原始分支名称，将在当前项目根路径（仅trunk有效）、tags、branches下同时寻找\n寻找顺序：tags -> branches -> 项目根路径'
  )
  .action(async (branchName, projectPath, baseBranchesName) => {
    try {
      console.log('[1/5] 获取本地项目的远端路径...');
      const safeProjectPath = projectPath ?? (await SvnHelper.getRootDirFromLocal());
      console.log('[2/5] 获取项目远端根路径...');
      const rootDir = await SvnHelper.getProjectRootDir(safeProjectPath);
      console.log('[3/5] 构建原始版本远端路径...');
      let originalBranchesPath = await SvnHelper.getBaseBranches(rootDir, baseBranchesName.base);
      console.log('[4/5] 构建目标分支路径...');
      const newBranchesPath = await SvnHelper.getNewBranches(rootDir, branchName);
      console.log('[5/5] 创建分支中...');
      await SvnHelper.fork(originalBranchesPath, newBranchesPath, branchName);
      console.log('[DONE] Fork 操作成功完成!');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
    }
  })
  .parse(process.argv);
