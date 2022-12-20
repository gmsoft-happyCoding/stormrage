#!/usr/bin/env node

const program = require('commander');
const { ErrorHelper, ErrorCode } = require('../lib/utils/ErrorHelper');
const { MergeHelper } = require('../lib/utils/MergeHelper');

program
  .argument(
    '<branchName>',
    '（必须）合并的分支名称，如果已不存在对应的分支，则拒绝执行，并抛出异常'
  )
  .option('--delete-source', '如果合并成功，则删除原始分支')
  .action(async branchName => {
    const options = program.opts();
    try {
      console.log('[1/6] 获取本地项目的远端路径...');
      // 获取项目的远端路径
      const safeProjectPath = await MergeHelper.getRootDirFromLocal();
      console.log('[2/6] 获取项目远端根路径...');
      // 获取当前的项目远端根路径
      const rootDir = await MergeHelper.getProjectRootDir(safeProjectPath);
      console.log('[3/6] 获取目标分支远端路径...');
      // 构建合并的目标分支路径
      let originalBranchesPath = await MergeHelper.getBaseBranches(rootDir, branchName);

      console.log('[4/6] 拉取目标分支修改到本地...');
      await MergeHelper.up();

      // 拉取远程分支修改到本地
      await MergeHelper.merge(originalBranchesPath);
      const result = await MergeHelper.status('./');
      console.log('[5/6] 检查文件冲突情况...');
      let isConflicted = false;
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const wcStatus = item['wc-status'];
        if (wcStatus?.$?.item === 'conflicted') {
          isConflicted = true;
          break;
        }
      }

      if (isConflicted) {
        console.log(
          '[WARN] Merge操作已将远端修改拉取到本地，发现冲突，无法自动完成后续操作，请手动处理冲突文件后自行提交！'
        );
        console.log('[DONE] Merge操作已完成（存在冲突）');
        return;
      }

      // 找到所有没有没有加入版本管理的文件，加入到版本管理中
      const unVersioned = result
        .filter(i => i['wc-status'].$.item === 'unversioned')
        // 放置文件名或者路径上有空格，统一使用双引号包裹
        .map(i => `"${i.$.path}"`);
      if (unVersioned.length > 0) {
        await MergeHelper.add(unVersioned);
      }

      console.log('[6/6] 提交合并到远端...');
      // 提交合并
      await MergeHelper.commit(`[Merge] ${branchName} 分支合并，由stormrage CLI 完成`);

      // 删除原始分支
      if (options.deleteSource === true) {
        try {
          console.log('[*] 正在删除原始分支...');
          await MergeHelper.delete(originalBranchesPath, '[Remove] 该分支已合并');
        } catch (error) {
          console.error('[WARN]: %s', ErrorHelper.getErrorMessage(error.message));
        }
      }

      console.log('[DONE] Merge 操作成功完成!');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'merge'));
    }
  })
  .parse(process.argv);
