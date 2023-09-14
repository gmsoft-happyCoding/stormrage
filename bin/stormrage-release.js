#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { ReleaseHelper } = require('../lib/utils/ReleaseHelper');
const { snapShootDirName, SvnHelper } = require('../lib/utils/SvnHelper');
const { UrlHelper } = require('../lib/utils/UrlHelper');

program
  .argument(
    '<branchName>',
    '（必须）封板的分支名称，对于主从管理模式，此参数请固定传递:"master"，对于传统管理模式的项目\n将在branches下寻找对应版本（trunk则在根路径下尝试匹配）。'
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
      if (options.tag && !ReleaseHelper.normalPattern.test(options.tag)) {
        ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_TAG_VERSION_INVALID);
      }

      console.log('[1/6] 获取本地项目的远端路径...');
      const safeProjectPath = UrlHelper.isLink(projectPath)
        ? projectPath
        : await ReleaseHelper.getRootDirFromLocal(projectPath);
      console.log('[2/6] 获取项目远端根路径...');
      const rootDir = await ReleaseHelper.getProjectRootDir(safeProjectPath);
      console.log('[3/6] 构建原始版本远端路径...');
      // 构建封版分支路径：如果是主从分支管理模式，将直接使用主分支作为封板分支；如果是传统模式，则使用传入的分支名进行封版
      let releaseBranchesPath = await ReleaseHelper.getReleaseBranches(rootDir, branchName);
      // 获取当前Master分支的版本号
      const masterVersion = await ReleaseHelper.getBranchVersion(releaseBranchesPath);
      const masterMainVersion = masterVersion.replace(ReleaseHelper.mainReleaseSuffix, '');

      // 如果当前Master分支已经是封版状态，则不允许再次封版
      if (masterVersion.endsWith(ReleaseHelper.mainReleaseSuffix)) {
        ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_NOT_UPGRADE);
      }

      console.log('[4/6] 构建封版版本远端路径...');
      let targetBranchesPath = await ReleaseHelper.getSnapshotVersion(rootDir, options);

      const branchIsExists = await SvnHelper.dirIsExist(targetBranchesPath);
      if (branchIsExists) {
        ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_TAG_VERSION_IS_EXIST);
      }

      // 版本名称，用于封版的common拼接，更新项目内的版本号
      const releaseVersion = await ReleaseHelper.getReleaseVersion(releaseBranchesPath);

      console.log('[5/6] 正在Fork目标版本...');
      await ReleaseHelper.fork(releaseBranchesPath, targetBranchesPath, masterMainVersion);

      console.log('[6/6] 正在更新Master分支版本号...');
      await SvnHelper.updateNewBranchesVersion(releaseBranchesPath, releaseVersion);

      // 如果传递了删除原始分支的参数，则删除原始分支
      try {
        if (options.deleteSource) {
          console.log('[*] 删除原始分支...');
          await ReleaseHelper.delete(releaseBranchesPath, '[Release] 封版原始分支删除');
        }
      } catch (error) {
        console.error(chalk.yellow('[WARN]: 分支删除失败，请检查是否存在文件锁'));
      }
      console.log(
        `[DONE] Release 操作成功完成，封板版本号：${masterMainVersion}，当前Master版本号：${releaseVersion}`
      );
    } catch (error) {
      console.error(
        '[ERROR]: %s',
        ErrorHelper.getErrorMessage(error.message, 'release'),
        error.stack
      );
      process.exit(1);
    }
  })
  .parse(process.argv);
