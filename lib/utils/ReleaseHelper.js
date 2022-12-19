const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const {
  SvnHelper,
  mainBranchesName,
  branchesDirName,
  trunkDirName,
  snapShootDirName,
} = require('./SvnHelper');

class ReleaseHelper extends SvnHelper {
  static async getReleaseBranches(rootDir, branchesName) {
    const versionMode = await this.getVersionMode(rootDir);
    let releaseBranchesPath = '';
    // 主从模式直接使用固定分支路径
    if (versionMode === this.VERSION_MODE_MASTER) {
      releaseBranchesPath = `${rootDir}/${mainBranchesName}`;
    } else {
      if (branchesName === trunkDirName) {
        // trunk 版本直接拼接
        releaseBranchesPath = `${rootDir}/${branchesName}`;
      } else {
        // 非trunk版本，在branches下寻找
        releaseBranchesPath = `${rootDir}/${branchesDirName}/${branchesName}`;
      }
    }

    const dirExists = await this.dirIsExists(releaseBranchesPath);
    if (dirExists) {
      return releaseBranchesPath;
    }
    ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_BRANCHES_NOT_EXIST);
  }

  /**
   * 根据 major | minor | patch 以及当前项目最新的快照版本生成下一个快照版本号
   * @param {*} rootDir 项目根路径
   * @param {*} type 封版版本类型 major | minor | patch
   * @returns
   */
  static async getSnapshotVersion(rootDir, options) {
    if (typeof options.tag === 'string') {
      const nextVersion = `${rootDir}/${snapShootDirName}/${options.tag}`;
      const alreadyExists = await this.dirIsExists(nextVersion);
      if (alreadyExists) {
        ErrorHelper.throwError(ErrorCode.ERROR_TARGET_BRANCHES_EXIST);
      }
      return nextVersion;
    }

    const maxVersionPath = await this.getLatestBranchesFromTags(rootDir);
    const matchVersion = maxVersionPath.match(/(?:\d+\.){2}\d$/);
    if (!matchVersion) {
      ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_LATEST_NOT_FOUND);
    }
    const maxVersion = matchVersion[0];
    const [major, minor, patch] = maxVersion.split('.').map(i => +i);
    let nextVersion = '';
    getNext: {
      if (options.major) {
        nextVersion = `${major + 1}.0.0`;
        break getNext;
      }
      if (options.minor) {
        nextVersion = `${major}.${minor + 1}.0`;
        break getNext;
      }
      nextVersion = `${major}.${minor}.${patch + 1}`;
    }
    return `${rootDir}/${snapShootDirName}/${nextVersion}`;
  }
}

module.exports = { ReleaseHelper };
