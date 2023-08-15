const lodash = require('lodash');
const path = require('path');
const svnUltimate = require('node-svn-ultimate');
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const { UrlHelper } = require('./UrlHelper');
const { FileHelper } = require('./FileHelper');
const fs = require('fs-extra');
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

/** 项目根路径判断规则：当前路径下存在下面两个文件夹，则认为是合法的项目根路径 */
const judgeRule = ['tags', 'branches'];
/** 主分支名称 */
const mainBranchesName = 'master';
/** 支线分支存放位置 */
const branchesDirName = 'branches';
/** 传统管理模式下的长线分支名称 */
const trunkDirName = 'trunk';
/** 快照版本存放位置 */
const snapShootDirName = 'tags';
/** 分支创建描述信息 */
const forkCommons = '[Fork] 创建新的分支 $1 ，由 stormrage CLI完成';

class SvnHelper {
  /** 传统模式 */
  static VERSION_MODE_TRADITION = 'tradition';
  /** 主从模式 */
  static VERSION_MODE_MASTER = 'master';

  /**
   * 获取目标路径下的文件列表信息
   * @param {*} targetUrl 目标文件路径，设计上是远程路径，本地路径暂未测试
   * @returns 文件组信息
   */
  static async getList(targetUrl) {
    const dirExists = await this.dirIsExist(targetUrl);
    if (!dirExists) {
      ErrorHelper.throwError(ErrorCode.ERROR_REMOTE_DIR_INVALID);
    }
    const fileList = await new Promise(function (resolve, reject) {
      svnUltimate.commands.list(targetUrl, { quiet: true }, (err, opt) => {
        if (!err) {
          const { list } = opt;
          const entry = lodash.get(list, 'entry', []);
          if (lodash.isArray(entry)) {
            return resolve(entry);
          }
          return resolve(entry ? [entry] : []);
        }
        reject(err);
      });
    });
    return fileList;
  }

  /**
   * 判断当前路径是不是项目根路径，判断规则：如果当前路径下存在tags,branches则认定为项目根路径
   * @param {*} targetUrl 目标路径
   * @returns 如果是根路径，则返回true，否则返回false
   */
  static async isProjectRootDir(targetUrl) {
    const fileList = await this.getList(targetUrl);
    // fileList在当前文件夹下仅有一个文件或者文件夹时，返回的是对象，因此需要做数组兼容处理
    const dirNames = (lodash.isArray(fileList) ? fileList : [fileList]).map(i => i.name);
    return lodash.intersection(judgeRule, dirNames).length === 2;
  }

  /**
   * 按路径逐级寻找项目根路径
   * @param {*} targetUrl 目标路径（远程路径）
   * @returns 返回对应路径的最深项目根路径（路过路径上存在多个满足规则的根路径，取最深的）
   */
  static async getProjectRootDir(targetUrl) {
    const currentUrl = new UrlHelper(targetUrl);
    try {
      const isProjectRootDir = await this.isProjectRootDir(targetUrl);
      if (isProjectRootDir) {
        return targetUrl.replace(/\/$/, '');
      }
    } catch (error) {
      if (currentUrl.isTopUrl) {
        ErrorHelper.throwError(ErrorCode.ERROR_BASE_BRANCHES_NOT_EXIST);
      }
    }
    // 将当前路径回退后继续寻找
    return await this.getProjectRootDir(currentUrl.prev().currentUrl);
  }

  /**
   * 从本地路径获取SVN信息，然后尝试确定项目远端根路径位置
   * @param {*} localDirPath 目标路径（本地路径）默认是当前工作路径
   * @returns 返回项目远端根路径
   */
  static async getRootDirFromLocal(localDirPath = './') {
    let info = null;
    try {
      info = await new Promise(function (resolve, reject) {
        svnUltimate.commands.info(localDirPath, { quiet: true }, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_CURRENT_DIR_INVALID);
    }
    return await this.getProjectRootDir(info.entry.url);
  }

  /**
   * 目标路径在版本管理中是否存在
   * @param {*} targetUrl 目标路径
   * @returns 如果存在返回true，不存在返回false
   */
  static async dirIsExist(targetUrl) {
    try {
      await new Promise(function (resolve, reject) {
        svnUltimate.commands.list(targetUrl, { quiet: true }, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
      return true;
    } catch (error) {
      if (error.message.includes('E200009')) {
        return false;
      }
      ErrorHelper.throwError(ErrorCode.ERROR_UNKNOWN, error.message);
    }
  }

  /**
   * 目标文件在版本管理中是否存在
   * @param {*} targetUrl 目标路径
   * @returns 如果存在返回true，不存在返回false
   */
  static async fileIsExist(targetUrl) {
    try {
      await new Promise(function (resolve, reject) {
        svnUltimate.commands.cat(targetUrl, { quiet: true }, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
      return true;
    } catch (error) {
      if (error.message.includes('E200009')) {
        return false;
      }
      ErrorHelper.throwError(ErrorCode.ERROR_UNKNOWN, error.message);
    }
  }

  /**
   * 获取当前项目的源码管理模式
   * @param {*} rootDir 项目根路径
   * @returns 返回 tradition （传统模式） | master （主从模式）
   */
  static async getVersionMode(rootDir) {
    const dirs = await this.getList(rootDir);
    const dirNames = dirs.map(dir => dir.name);
    if (dirNames.includes(mainBranchesName)) {
      return this.VERSION_MODE_MASTER;
    }
    return this.VERSION_MODE_TRADITION;
  }

  /**
   * 获取当前项目的版本号
   * @param {*} rootDir 项目根路径
   * @param {string} version package.json文件中项目版本号
   */
  static async getCurrentVersionFromPackageJSON(rootDir) {
    const packageJSONPath = `${rootDir}/package.json`;
    const packageJSONExists = await this.fileIsExist(packageJSONPath);
    if (!packageJSONExists) {
      ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_PACKAGE_JSON_NOT_EXIST);
    }
    const packageJSON = await this.cat(packageJSONPath);
    return JSON.parse(packageJSON).version;
  }

  static async getBaseBranches(rootDir, baseBranchesName) {
    const branchesMode = await this.getVersionMode(rootDir);
    // 如果没有指定原始分支名称，则默认根据管理模式分别指定默认的原始分支
    if (!baseBranchesName) {
      if (branchesMode === this.VERSION_MODE_TRADITION) {
        // 传统管理模式（trunk+tags）使用tags最后一个版本作为base
        return await this.getLatestBranchesFromTags(rootDir);
      } else {
        // 主从模式，使用main分支作为base
        return `${rootDir}/${mainBranchesName}`;
      }
    }
    // 指定了版本名称，分别在tags下以及branches下寻找
    const tagsPath = `${rootDir}/${snapShootDirName}/${baseBranchesName}`;
    const branchesPath = `${rootDir}/${branchesDirName}/${baseBranchesName}`;
    const rootPath = `${rootDir}/${baseBranchesName}`;
    // 在Tags下寻找
    const inTags = await this.dirIsExist(tagsPath);
    if (inTags) {
      return tagsPath;
    }
    // 在branches下寻找
    const inBranches = await this.dirIsExist(branchesPath);
    if (inBranches) {
      return branchesPath;
    }
    // 在当前项目根路径下寻找
    const inRoot = await this.dirIsExist(rootPath);
    if (inRoot) {
      return rootPath;
    }
    ErrorHelper.throwError(ErrorCode.ERROR_BASE_BRANCHES_NOT_EXIST);
  }

  /** 获取版本号列表中最大的版本 */
  static getMaxVersion(versions) {
    const compare = (v1, v2) => {
      const v1Val = v1.split('.').map(t => +t); // 去除无意义的0
      const v2Val = v2.split('.').map(t => +t);
      const maxLen = Math.max(v1Val.length, v2Val.length);
      for (let i = 0; i < maxLen; i++) {
        let n1 = v1Val[i] || 0;
        let n2 = v2Val[i] || 0;
        if (n1 > n2) return 1;
        else if (n1 < n2) return -1;
      }
      return 0;
    };
    // 找出所有Tags版本号中最大的版本号
    return versions.reduce((prev, curr) => {
      return compare(prev, curr) === -1 ? curr : prev;
    }, '1.0.0');
  }

  /** 从Tags下获取最新的版本路径 */
  static async getLatestBranchesFromTags(rootDir) {
    const versions = await this.getList(`${rootDir}/tags`);
    if (lodash.isEmpty(versions)) {
      ErrorHelper.throwError(ErrorCode.ERROR_TAGS_EMPTY);
    }
    const latestVersion = this.getMaxVersion(versions.map(tag => tag.name));
    return `${rootDir}/tags/${latestVersion}`;
  }

  /**
   * 安全的获取新分支的路径
   * @param {*} rootDir 项目远程根路径
   * @param {*} branchName 新分支的名称
   * @returns 新的分支远程路径
   */
  static async getNewBranches(rootDir, branchName) {
    let newBranchesPath = '';
    const branchesMode = await this.getVersionMode(rootDir);
    // 如果是传统模式 && 分版名称是 trunk，则将分支放置在项目根路径下，否则就放置在分支目录下
    if (branchesMode === this.VERSION_MODE_TRADITION && branchName === trunkDirName) {
      newBranchesPath = `${rootDir}/${branchName}`;
    } else {
      newBranchesPath = `${rootDir}/${branchesDirName}/${branchName}`;
    }
    const alreadyExists = await this.dirIsExist(newBranchesPath);
    if (alreadyExists) {
      ErrorHelper.throwError(ErrorCode.ERROR_TARGET_BRANCHES_EXIST);
    }
    return newBranchesPath;
  }

  /**
   * 创建新版本
   * @param {*} original 原始版本路径
   * @param {*} destination 目标版本路径
   * @param {*} branchName 新分支的名称（用于拼接提交的commons）
   */
  static async fork(original, destination, branchName) {
    try {
      await new Promise(function (resolve, reject) {
        svnUltimate.commands.copy(
          original,
          destination,
          { quiet: true, msg: `${forkCommons.replace('$1', branchName)}` },
          err => {
            if (!err) {
              return resolve();
            }
            reject(err);
          }
        );
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_FORK_FAILED, error.message);
    }
  }

  /**
   * 文件删除操作
   * @param {*} filePath 删除的文件路径
   * @param {*} common 备注信息
   */
  static async delete(filePath, common = 'delete') {
    try {
      await new Promise(function (resolve, reject) {
        svnUltimate.commands.del(filePath, { quiet: true, msg: common }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_RELEASE_DEL_FAILED, error.message);
    }
  }

  static async status(filePath) {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.status(filePath, { quiet: true }, (err, opt) => {
          if (!err) {
            const { target } = opt;
            return resolve(target.entry ?? []);
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_DIR_STATUS_FAILED, error.message);
    }
  }

  /**
   * 拉取最新的远程修改到本地，update操作
   * @returns
   */
  static async up() {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.up(undefined, { quiet: true }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_DIR_UPDATE_FAILED, error.message);
    }
  }

  /**
   * 将文件添加到版本管理
   * @param {*} filePath
   * @returns
   */
  static async add(filePath) {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.add(filePath, { quiet: true }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_DIR_ADD_FAILED, error.message);
    }
  }

  /**
   * 提交修改
   * @param {*} common 提交描述
   * @returns
   */
  static async commit(common, fileOrDir) {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.ci(fileOrDir, { quiet: true, msg: common }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_DIR_CI_FAILED, error.message);
    }
  }

  /**
   * 将制定位置的文件导入到SVN目标位置
   * @param {*} src 原始位置
   * @param {*} dest 目标位置
   * @param {*} common 提交描述
   * @returns
   */
  static async import(src, dest, common = 'chore：由Stormrage CLI Make指令自动提交的配置文件') {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.import(src, dest, { quiet: true, msg: common }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_IMPORT_FAILED, error.message);
    }
  }

  /**
   * 将SVN目标位置的文件导出到指定位置
   * @param {*} src 原始位置
   * @param {*} dest 目标位置
   * @returns
   */
  static async checkout(src, dest, opt = {}) {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.checkout(src, dest, { quiet: true, ...opt }, err => {
          if (!err) {
            return resolve();
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_CHECKOUT_FAILED, error.message);
    }
  }

  static async cat(filePath) {
    try {
      return await new Promise(function (resolve, reject) {
        svnUltimate.commands.cat(filePath, { quiet: true }, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_CAT_FAILED, error.message);
    }
  }

  static async getRemotePath(localPath) {
    try {
      const info = await new Promise(function (resolve, reject) {
        svnUltimate.commands.info(localPath, { quiet: true }, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
      return info.entry.url;
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_GET_REMOTE_PATH_FAILED, error.message);
    }
  }

  /**
   * 获取目标路径下的唯一文件夹路径，如果存在多个文件夹，则抛出异常
   * @param {*} dirPath 目标文件夹路径
   * @returns 返回下级唯一的文件夹路径
   */
  static async getUniqSubDirectory(dirPath) {
    const subFiles = await this.getList(dirPath);

    const subDirs = subFiles.filter(i => i['$'].kind === 'dir');

    if (subDirs.length !== 1) {
      ErrorHelper.throwError(ErrorCode.ERROR_BRANCHES_DIR_INVALID);
    }

    return `${dirPath}/${subDirs[0].name}`;
  }

  /**
   * 更新主版本号
   * @param {*} newBranchesPath 项目分支路径或者子路径
   * @param {*} newVersion 可选的目标版本，如果不传递，使用特殊规则生成：原始版本号-<newBranchesPath的basename>
   */
  static async updateNewBranchesVersion(newBranchesPath, newVersion) {
    const projectRoot = await this.getProjectRootDir(newBranchesPath);
    const versionsMode = await this.getVersionMode(projectRoot);
    // 仅在主从模式下更新版本号，检查当前项目的类型，如果是Mono项目，则需要进行子项目版本号同步更新
    if (versionsMode === this.VERSION_MODE_MASTER) {
      // 获取项目根路径下唯一的下级目录
      const projectRootDir = await this.getUniqSubDirectory(newBranchesPath);

      const packagesDirIsExist = await this.dirIsExist(`${projectRootDir}/packages`);

      const needUpdateSubVersionPath = [projectRootDir];

      if (packagesDirIsExist) {
        // mono项目，需要进行额外的子项目版本更新
        const packagesSubDir = (await this.getList(`${projectRootDir}/packages`))
          .filter(i => i.$.kind === 'dir')
          .map(i => `${projectRootDir}/packages/${i.name}`);
        // 检查packages下的子项目是否存在package.json
        const allTask = packagesSubDir.map(async pathItem => {
          // 使用SVN判断pathItem是否是文件夹
          const isProject =
            (await this.dirIsExist(pathItem)) &&
            (await this.fileIsExist(`${pathItem}/package.json`));
          if (isProject) {
            // 是项目，需要更新子项目的版本号
            needUpdateSubVersionPath.push(pathItem);
          }
        });

        await Promise.all(allTask);
      }

      const branchName = path.basename(newBranchesPath);

      // 更新新Fork项目的版本号
      await this.updateForkProjectVersion(needUpdateSubVersionPath, branchName, newVersion);
    }
  }

  static async updateForkProjectVersion(needUpdateSubVersionPath, branchName, fillVersionName) {
    for (let i = 0; i < needUpdateSubVersionPath.length; i++) {
      const projectPath = needUpdateSubVersionPath[i];

      const tempDir = FileHelper.getTempDirPath();

      const shell = `svn update --set-depth files "package.json"`;

      await fs.mkdir(tempDir, { recursive: true });
      // 检出项目根路径，不检出任何文件
      await this.checkout(projectPath, tempDir, { depth: 'empty' });

      await exec(shell, { cwd: tempDir });

      const packageJsonPath = path.join(tempDir, 'package.json');

      const originalVersion = (await fs.readJSON(packageJsonPath)).version;

      // 如果外部传递了fillVersionName，则使用外部传递的版本号，否则使用原始版本号+分支名称
      // 1、原始版本号+分支名称场景：Fork创建新的开发分支，此时需要使用原始版本号+分支名称
      // 2、外部传递版本号场景：Release封板，此时需要使用外部传递的版本号，对Master分支进行版本号更新
      const newVersion = fillVersionName ? fillVersionName : `${originalVersion}-${branchName}`;

      const fileContent = await FileHelper.readFileContent(packageJsonPath);

      const versionPattern = new RegExp('(?<="version": ")(\\d+\\.){2}\\d+(?=")');

      // 如果当前文件中没有版本号，则跳过文件处理
      if (versionPattern.test(fileContent) === false) {
        await fs.remove(tempDir);
        continue;
      }

      await FileHelper.writeFileContent(
        packageJsonPath,
        fileContent.replace(new RegExp('(?<="version": ")(\\d+\\.){2}\\d+(?=")'), newVersion)
      );

      await this.commit(`chore: 更新版本号为 ${newVersion}`, tempDir);

      await fs.remove(tempDir);
    }
  }
}

module.exports = {
  SvnHelper,
  judgeRule,
  mainBranchesName,
  branchesDirName,
  trunkDirName,
  snapShootDirName,
};
