const lodash = require('lodash');

const ErrorCode = {
  /** 基础分支不存在 */
  ERROR_BASE_BRANCHES_NOT_EXIST: 1000,
  /** 目标分支已存在 */
  ERROR_TARGET_BRANCHES_EXIST: 1001,
  /** 项目根路径未找到 */
  ERROR_ROOT_DIR_NOT_FOUND: 1002,
  /** 当前本地目录没有版本托管信息 */
  ERROR_CURRENT_DIR_INVALID: 1003,
  /** 远端路径无效 */
  ERROR_DIR_INVALID: 1004,
  /** Tags中无任何历史版本，此项目可能为新项目，无法依据Tags自动选定最新的原始版本 */
  ERROR_TAGS_EMPTY: 1005,
  /** Fork失败,原因未知 */
  ERROR_FORK_FAILED: 1006,
  /** 获取当前文件夹状态失败 */
  ERROR_DIR_STATUS_FAILED: 1007,
  /** 版本管理添加文件失败 */
  ERROR_DIR_ADD_FAILED: 1008,
  /** 版本管理提交失败 */
  ERROR_DIR_CI_FAILED: 1009,
  /** 版本管理更新失败 */
  ERROR_DIR_UPDATE_FAILED: 1010,

  /** 封板失败，未找到对应分支 */
  ERROR_RELEASE_BRANCHES_NOT_EXIST: 2000,
  /** 封板失败，未匹配到合法的最新分支路径，请检查tags下的版本号是否符合规范 */
  ERROR_RELEASE_LATEST_NOT_FOUND: 2001,
  /** 封板失败，目标分支已经存在，请检查传入的tag参数是否正确*/
  ERROR_RELEASE_FAILED: 2002,
  /** 文件删除失败，请检查相关路径是否存在*/
  ERROR_RELEASE_DEL_FAILED: 2003,

  /** 未知错误 */
  ERROR_UNKNOWN: 7000,
};

const ErrorMessage = {
  /** Fork 相关错误信息 */
  [ErrorCode.ERROR_BASE_BRANCHES_NOT_EXIST]:
    '基础分支不存在\n1、如果您传递了base分支名，请确定base原始分支名称是否正确\n2、如果您未传递base，则表明当前项目不存在main分支以及tags分支，这可能是一个新项目，因此无法完成分支创建任务！',
  [ErrorCode.ERROR_TARGET_BRANCHES_EXIST]: '目标分支已存在，拒绝执行分支创建操作！',
  [ErrorCode.ERROR_ROOT_DIR_NOT_FOUND]:
    '在远端路径上未匹配到项目根路径，提供的远端路径不存在符合规则的项目根路径（路径下存在 tags、branches），请检查远端路径是否正确！',
  [ErrorCode.ERROR_CURRENT_DIR_INVALID]:
    '当前目录未发现版本托管信息，请在具有版本托管的目录中执行或根据命令规则提供远端版本管理路径',
  [ErrorCode.ERROR_DIR_INVALID]: '远端路径不存在，请检查您传入的远端路径是否正确！',
  [ErrorCode.ERROR_TAGS_EMPTY]:
    'Tags中无任何历史版本，此项目可能为新项目，无法依据Tags自动选定最新的原始分支版本',
  [ErrorCode.ERROR_FORK_FAILED]: 'Fork失败，原因未知',
  [ErrorCode.ERROR_DIR_STATUS_FAILED]: '获取当前文件夹状态失败',
  [ErrorCode.ERROR_DIR_ADD_FAILED]: '版本管理添加文件失败',
  [ErrorCode.ERROR_DIR_CI_FAILED]: '版本管理提交失败',
  [ErrorCode.ERROR_DIR_UPDATE_FAILED]: '版本管理更新失败',

  /** Release 相关错误信息 */
  [ErrorCode.ERROR_RELEASE_BRANCHES_NOT_EXIST]:
    '封板失败，未找到目标分支。您传递的branchName参数可能是错误的，请检查！',
  [ErrorCode.ERROR_RELEASE_FAILED]: '目标分支已存在，拒绝执行分支创建操作！',
  [ErrorCode.ERROR_RELEASE_DEL_FAILED]:
    '删除分支失败，请检查原始分支是否存在文件锁，解锁后手动删除原始分支（如果您执行的是封版操作，则封版操作已完成，仅仅是删除原始分支失败）！',

  [ErrorCode.ERROR_UNKNOWN]: '未知错误',
};

const TipsMessage = {
  fork: '当前命令用法：stormrage fork <branchName> [projectPath] [-b|--base <baseBranchesName>]',
  release:
    '当前命令用法：stormrage release <branchName> [projectPath] [-t|--tag <tagVersion>] [--major|--minor|--patch]',
  merge: '当前命令用法：stormrage merge <branchName>',
};

class ErrorHelper {
  static separator = '@@_E&';

  static throwError(errorCode, message) {
    throw new Error(`${errorCode}${this.separator}${message ?? ''}`);
  }
  static getErrorMessage(error, tipsType) {
    if (error.includes(this.separator)) {
      const [errorCode, errorMsg] = error.split(this.separator);
      const tips = `\n\n${TipsMessage[tipsType]}` ?? '';
      return ErrorMessage[errorCode]
        ? `${ErrorMessage[errorCode]}${tips}\n\n额外的错误信息: ${
            lodash.isEmpty(errorMsg) ? '无' : errorMsg
          }`
        : ErrorMessage[ErrorCode.ERROR_UNKNOWN];
    } else {
      return `${ErrorMessage[ErrorCode.ERROR_UNKNOWN]}\n\n 额外的错误信息：${error}`;
    }
  }
}

module.exports = {
  ErrorCode,
  ErrorMessage,
  ErrorHelper,
};
