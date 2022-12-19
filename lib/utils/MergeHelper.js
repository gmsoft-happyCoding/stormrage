const svnUltimate = require('node-svn-ultimate');
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const {
  SvnHelper,
  mainBranchesName,
  branchesDirName,
  trunkDirName,
  snapShootDirName,
} = require('./SvnHelper');

class MergeHelper extends SvnHelper {
  static async merge(targetPath) {
    try {
      await new Promise(function (resolve, reject) {
        svnUltimate.commands.merge(targetPath, {}, (err, opt) => {
          if (!err) {
            return resolve(opt);
          }
          reject(err);
        });
      });
      return true;
    } catch (error) {
      console.error('[ERROR]:', error.message);
      ErrorHelper.throwError(ErrorCode.ERROR_UNKNOWN);
    }
  }
}

// TODO 合并后检测是否存在文件冲突，如果存在冲突则终止，如果不存在冲突，则提交到服务端

module.exports = { MergeHelper };

// svn merge --reintegrate https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/branches/test1
// svn mergeinfo https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/branches/test1 https://192.168.2.10:8080/svn/GmsoftPlatform/B持续交付与自动化/CICD开发测试目录/New/main
