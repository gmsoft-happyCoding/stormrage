#!/usr/bin/env node

const program = require('commander');
const { merge } = require('../lib/commands/merge/merge');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');
const { MergeHelper } = require('../lib/utils/MergeHelper');
const { ReleaseHelper } = require('../lib/utils/ReleaseHelper');
const { UrlHelper } = require('../lib/utils/UrlHelper');

program
  .argument(
    '<branchName>',
    '（必须）合并的分支名称，如果已不存在对应的分支，则拒绝执行，并抛出异常'
  )
  .argument(
    '[projectPath]',
    '（可选）项目路径（可以是项目子目录），可以是远程路径也可以是本地路径，自动识别；\n如果不传递，则默认为当前工作目录："./"',
    undefined
  )
  .option('--delete-source', '如果合并成功，则删除原始分支')
  .option(
    '--major',
    '表明此次合并的版本为大版本升级（对应版本号：N+1.0.0），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '--minor',
    '表明此次合并的版本为小版本升级（对应版本号：*.N+1.0），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '--patch',
    '表明此次合并的版本为问题修正的版本升级（对应版本号：*.*.N+1），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '-t, --tag <tagVersion>',
    '此次合并的版本，此参数优先级高于其它版本号控制参数，此参数仅用于特殊情况下使用，请使用前述的版本控制参数'
  )
  .action(async (branchName, projectPath) => {
    try {
      console.log('[1/10] 获取本地项目的远端路径...');
      const safeProjectPath = UrlHelper.isLink(projectPath)
        ? projectPath
        : await ReleaseHelper.getRootDirFromLocal(projectPath);
      console.log('[2/10] 获取项目远端根路径...');
      const rootDir = await MergeHelper.getProjectRootDir(safeProjectPath);

      await merge(branchName, rootDir);

      console.log('[DONE] Merge 操作成功完成!');
    } catch (error) {
      console.error(
        '[ERROR]: %s',
        ErrorHelper.getErrorMessage(error.message, 'merge'),
        error.message
      );
    }
  })
  .parse(process.argv);
