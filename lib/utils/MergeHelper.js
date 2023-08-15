const svnUltimate = require('node-svn-ultimate');
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const { SvnHelper } = require('./SvnHelper');

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

module.exports = { MergeHelper };
