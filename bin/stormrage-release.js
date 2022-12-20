#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { ReleaseHelper } = require('../lib/utils/ReleaseHelper');
const { snapShootDirName } = require('../lib/utils/SvnHelper');

program
  .argument(
    '<branchName>',
    '（必须）封板的分支名称，对于主从管理模式，此参数请固定传递main，对于传统管理模式的项目\n将在branches下寻找对应版本（trunk则在根路径下尝试匹配）。'
  )
  .argument(
    '[projectPath]',
    '（可选）项目路径（可以是项目子目录），可以是远程路径也可以是本地路径，自动识别；\n如果不传递，则默认为当前工作目录："./"',
    undefined
  )
  .option('--delete-source', '是否删除原始分支')
  .option(
    '--major',
    '表明此次封版的版本为大版本升级（对应版本号：N+1.0.0），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '--minor',
    '表明此次封版的版本为小版本升级（对应版本号：*.N+1.0），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '--patch',
    '表明此次封版的版本为问题修正的版本升级（对应版本号：*.*.N+1），如果存在多个版本控制参数，取版本号影响最大的'
  )
  .option(
    '-t, --tag <tagVersion>',
    '封版版本号，此参数优先级高于其它版本号控制参数，此参数仅用于特殊情况下使用，请使用前述的版本控制参数'
  )
  .action(async (branchName, projectPath) => {
    const options = program.opts();
    try {
      console.log('[1/5] 获取本地项目的远端路径...');
      const safeProjectPath = projectPath ?? (await ReleaseHelper.getRootDirFromLocal());
      console.log('[2/5] 获取项目远端根路径...');
      const rootDir = await ReleaseHelper.getProjectRootDir(safeProjectPath);
      console.log('[3/5] 构建原始版本远端路径...');
      // 构建封版分支路径：如果是主从分支管理模式，将直接使用主分支作为封板分支；如果是传统模式，则使用传入的分支名进行封版
      let releaseBranchesPath = await ReleaseHelper.getReleaseBranches(rootDir, branchName);
      console.log('[4/5] 构建封版版本远端路径...');
      let targetBranchesPath = await ReleaseHelper.getSnapshotVersion(rootDir, options);
      // 版本名称，用于封版的common拼接
      const versionName = targetBranchesPath.match(/(?:\d+\.){2}\d+$/)[0];

      console.log('[5/5] 正在Fork目标版本...');
      ReleaseHelper.fork(releaseBranchesPath, targetBranchesPath, versionName);

      // 如果是传统的管理模式，删除原始分支
      try {
        if (options.deleteSource) {
          console.log('[*] 删除原始分支...');
          await ReleaseHelper.delete(releaseBranchesPath, '[Release] 封版原始分支删除');
        }
      } catch (error) {
        console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message));
      }
      console.log(`[DONE] Release 操作成功完成，版本号：${versionName}`);
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'release'));
    }
  })
  .parse(process.argv);
