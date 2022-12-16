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
  ERROR_ERROR_FORK_FAILED: 1006,

  /** 未知错误 */
  ERROR_UNKNOWN: 7000,
};

const ErrorMessage = {
  [ErrorCode.ERROR_BASE_BRANCHES_NOT_EXIST]:
    '基础分支不存在\n1、如果您传递了base分支名，请确定base原始分支名称是否正确\n2、如果您未传递base，则表明当前项目不存在main分支以及tags分支，这可能是一个新项目，因此无法完成分支创建任务！',
  [ErrorCode.ERROR_TARGET_BRANCHES_EXIST]: '目标分支已存在，拒绝执行分支创建操作！',
  [ErrorCode.ERROR_ROOT_DIR_NOT_FOUND]:
    '在远端路径上未匹配到项目根路径，提供的远端路径不存在符合规则的项目根路径（路径下存在 tags、branches），请检查远端路径是否正确！',
  [ErrorCode.ERROR_CURRENT_DIR_INVALID]:
    '当前目录未发现版本托管信息，请在具有版本托管的目录中执行或提供远端版本管理路径',
  [ErrorCode.ERROR_DIR_INVALID]: '远端路径不存在，请检查您传入的远端路径是否正确！',
  [ErrorCode.ERROR_TAGS_EMPTY]:
    'Tags中无任何历史版本，此项目可能为新项目，无法依据Tags自动选定最新的原始分支版本',
  [ErrorCode.ERROR_FORK_FAILED]:
    'Tags中无任何历史版本，此项目可能为新项目，无法依据Tags自动选定最新的原始分支版本',
  [ErrorCode.ERROR_UNKNOWN]: '未知错误',
};

const TipsMessage = {
  fork: '当前命令用法：stormrage fork <branchName> [projectPath] [-b|--base <baseBranchesName>]',
};

class ErrorHelper {
  static separator = '@@_E&';

  static throwError(errorCode, message) {
    throw new Error(`${errorCode}${this.separator}${message ?? ''}`);
  }
  static getErrorMessage(error, tipsType) {
    const [errorCode, errorMsg] = error.split(this.separator);
    const tips = `\n\n${TipsMessage[tipsType]}` ?? '';
    return ErrorMessage[errorCode]
      ? `${ErrorMessage[errorCode]}${tips}\n\n额外的错误信息: ${errorMsg ?? 'nothing'}`
      : ErrorMessage[ErrorCode.ERROR_UNKNOWN];
  }
}

module.exports = {
  ErrorCode,
  ErrorMessage,
  ErrorHelper,
};
