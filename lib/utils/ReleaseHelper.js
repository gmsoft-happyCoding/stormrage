const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const {
  SvnHelper,
  mainBranchesName,
  branchesDirName,
  trunkDirName,
  snapShootDirName,
} = require('./SvnHelper');

class ReleaseHelper extends SvnHelper {
  /**
   * 说明：如果需要修改Make版本号生成规则，请注意修改此处的值定义、getMakeNextVersion中if条件分支不成立时的生成策略、getNextVersion中的容错处理
   *
   */
  /** Make版本号标记模式 */
  static rcPattern = /^(\d+\.){2}\d+-\d+$/;
  /** Make版本号切分模式 */
  static rcSplitPattern = /(?<=(?:(?:\d+\.){2}\d+))-/;

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

    const dirExists = await this.dirIsExist(releaseBranchesPath);
    if (dirExists) {
      return releaseBranchesPath;
    }
    ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_BRANCHES_NOT_EXIST);
  }

  /**
   * 根据升级的类型，产生下一个版本号（通用版本号）
   * @param {string} versionName 原始版本号
   * @param {object} opt 升级类型配置标识
   * @param {boolean} opt.major 大版本
   * @param {boolean} opt.minor 小版本
   * @param {boolean} opt.patch 修复版本
   * @returns
   */
  static getNextVersion(versionName, opt) {
    let version = versionName;
    // 如果版本号存在RC标记，则去除掉（这个过程是处理通用版本号的生成的，不应出现RC相关标记，这里是降级处理）
    if (this.rcPattern.test(version)) {
      version = version.replace(/-.*$/, '');
    }
    const [major, minor, patch] = version.split('.').map(i => +i);
    if (opt.major) {
      return `${major + 1}.0.0`;
    }
    if (opt.minor) {
      return `${major}.${minor + 1}.0`;
    }
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * 获取下一个持续集成的版本号，不改变应用版本号，只改变RC版本号
   * @param {string} latestMakeVersion 最后一个Make版本号，有可能没有
   * @param {string} mainVersion 应用主版本号
   */
  static getMakeNextVersion(latestMakeVersion, mainVersion) {
    if (!latestMakeVersion) {
      return `${mainVersion}-0`;
    }
    if (this.rcPattern.test(latestMakeVersion)) {
      // 版本号满足RC模式，将RC版本号增加 1 即可
      const [prev, back] = latestMakeVersion.split(this.rcSplitPattern);
      return `${prev}-${+back + 1}`;
    }
    // 不满足RC模式，直接添加即可
    return `${latestMakeVersion}-0`;
  }

  /**
   * 根据 major | minor | patch 以及当前项目最新的快照版本生成下一个快照版本号
   * @param {*} rootDir 项目根路径
   * @param {*} options 封版版本选项 { major:标识此次为大版本升级, minor:小版本升级, patch:问题修正版本,tag:直接指定的版本号（危险的参数，非特殊场景请勿使用） }
   * @returns
   */
  static async getSnapshotVersion(rootDir, options) {
    if (typeof options.tag === 'string') {
      const nextVersion = `${rootDir}/${snapShootDirName}/${options.tag}`;
      const alreadyExists = await this.dirIsExist(nextVersion);
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
    let nextVersion = this.getNextVersion(maxVersion, options);
    return `${rootDir}/${snapShootDirName}/${nextVersion}`;
  }
}

module.exports = { ReleaseHelper };
