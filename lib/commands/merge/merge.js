const fs = require('fs-extra');
const program = require('commander');
const lodash = require('lodash');
const { FileHelper } = require('../../utils/FileHelper');
const { SvnHelper, mainBranchesName, branchesDirName } = require('../../utils/SvnHelper');
const { MergeHelper } = require('../../utils/MergeHelper');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');
const { ReleaseHelper, mainVersionPattern } = require('../../utils/ReleaseHelper');

async function merge(branchName, projectPath) {
  const options = program.opts();
  const oCwd = process.cwd();

  const workDir = FileHelper.getTempDirPath();
  fs.removeSync(workDir);
  fs.mkdirSync(workDir, { recursive: true });
  process.chdir(workDir);

  try {
    console.log('[3/10] 拉取特性分支，同步主线版本号...');
    const featurePath = `${projectPath}/${branchesDirName}/${branchName}`;
    const masterBranchesPath = `${projectPath}/${mainBranchesName}`;

    const featureIsExist = await SvnHelper.dirIsExist(featurePath);
    if (!featureIsExist) {
      ErrorHelper.throwError(ErrorCode.ERROR_MERGE_INVALID_FEATURE_BRANCHES);
    }

    console.log('[4/10] 获取主线版本号...');
    // 获取主线版本号
    const mainBranchesPath = await ReleaseHelper.getBranchVersion(masterBranchesPath);

    // 传统分支管理模式下的判断容错
    const versionMode = await ReleaseHelper.getVersionMode(projectPath);
    if (versionMode !== ReleaseHelper.VERSION_MODE_MASTER) {
      ErrorHelper.throwError(ErrorCode.ERROR_MERGE_INVALID_FEATURE_BRANCHES);
    }

    console.log('[5/10] 同步特性分支版本号...');
    // 更新特性分支的版本号
    await SvnHelper.updateNewBranchesVersion(featurePath, mainBranchesPath);

    console.log('[6/10] 检出主线分支...');
    // 检出主线分支
    await SvnHelper.checkout(masterBranchesPath, workDir);

    console.log('[7/10] 合并特性分支至主线分支...');
    // 合并特性分支到主线
    await MergeHelper.merge(featurePath);

    const result = await MergeHelper.status('./');
    console.log('[8/10] 检查文件冲突情况...');
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
      // Merge操作已将远端修改拉取到本地，发现冲突
      ErrorHelper.throwError(ErrorCode.ERROR_MERGE_CONFLICTED);
    }

    // 找到所有没有没有加入版本管理的文件，加入到版本管理中
    const unVersioned = (lodash.isArray(result) ? result : [result])
      .filter(i => i['wc-status'].$.item === 'unversioned')
      // 放置文件名或者路径上有空格，统一使用双引号包裹
      .map(i => `"${i.$.path}"`);
    if (unVersioned.length > 0) {
      await MergeHelper.add(unVersioned);
    }

    console.log('[9/10] 提交合并到远端...');
    // 提交合并
    await MergeHelper.commit(`[Merge] ${branchName} 分支合并，由stormrage CLI 完成`);

    // 更新Master分支版本号
    let nextMasterVersion = mainBranchesPath.match(ReleaseHelper.mainVersionPattern);

    if (!nextMasterVersion) {
      console.log('[WARN] 主线版本匹配版本号失败，版本更新失败');
    } else {
      let nextMasterVersion = null;

      // 如果传递了明确的合并主线版本号，则直接使用传递的版本号进行主线版本号更新，如果没有，则使用计算的版本号进行更新
      if (options.tag) {
        nextMasterVersion = options.tag;
      } else {
        // 当前主线是否是release状态
        const masterBranchesIsReleaseState = mainBranchesPath.endsWith(
          ReleaseHelper.mainReleaseSuffix
        );
        // 常规版本号格式：x.x.x
        nextMasterVersion = nextMasterVersion[0];
        nextMasterVersion = ReleaseHelper.getNextVersion(
          nextMasterVersion,
          options,
          // 如果当前主线处于release状态，则进行自动升级，并且响应升级版本控制参数
          masterBranchesIsReleaseState
        );
        console.log('[10/10] 更新主线分支版本号...');
      }
      await SvnHelper.updateNewBranchesVersion(masterBranchesPath, nextMasterVersion);
    }

    // 删除原始分支
    if (options.deleteSource === true) {
      try {
        console.log('[*] 正在删除原始分支...');
        await MergeHelper.delete(featurePath, '[Remove] 该分支已合并');
      } catch (error) {
        console.error('[WARN]: %s', ErrorHelper.getErrorMessage(error.message));
      }
    }

    // 删除工作空间暂存文件
    process.chdir(oCwd);
    fs.removeSync(workDir);
  } catch (error) {
    process.chdir(oCwd);
    fs.removeSync(workDir);
    throw error;
  }
}

module.exports = { merge };
