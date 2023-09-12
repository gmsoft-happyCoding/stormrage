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
  ERROR_REMOTE_DIR_INVALID: 1004,
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
  /** SVN文件导入失败 */
  ERROR_IMPORT_FAILED: 1011,
  /** SVN文件迁出失败 */
  ERROR_CHECKOUT_FAILED: 1012,
  /** SVN获取远程路径失败 */
  ERROR_GET_REMOTE_PATH_FAILED: 1013,
  /** SVN获取文件内容失败 */
  ERROR_CAT_FAILED: 1014,
  /** SVN版本更新失败，无法确定项目根路径，该路径下存在多个文件夹 */
  ERROR_BRANCHES_DIR_INVALID: 1015,

  /** 封板失败，未找到对应分支 */
  ERROR_RELEASE_BRANCHES_NOT_EXIST: 2000,
  /** 封板失败，未匹配到合法的最新分支路径，请检查tags下的版本号是否符合规范 */
  ERROR_RELEASE_LATEST_NOT_FOUND: 2001,
  /** 封板失败，目标分支已经存在，请检查传入的tag参数是否正确*/
  ERROR_RELEASE_FAILED: 2002,
  /** 文件删除失败，请检查相关路径是否存在*/
  ERROR_RELEASE_DEL_FAILED: 2003,
  /** 封板项目package.json文件不存在 */
  ERROR_RELEASE_PACKAGE_JSON_NOT_EXIST: 2004,
  /** 封板指定的目标版本号非法，请使用如下形式的版本号：x.x.x */
  ERROR_RELEASE_TAG_VERSION_INVALID: 2005,
  /** 封板的目标版本已经存在，无法进行覆盖操作 */
  ERROR_RELEASE_TAG_VERSION_IS_EXIST: 2006,
  /** 当前主线版本处于Release状态，不允许再次执行Release动作，请合并特性分支后再尝试Release */
  ERROR_RELEASE_NOT_UPGRADE: 2007,

  /** Make失败，为获取到任何配置信息 */
  ERROR_MAKE_CONF_EMPTY: 3000,
  /** Make失败，生成新的Make版本号失败 */
  ERROR_MAKE_VERSION_GENERATE: 3001,
  /** Make失败：无法确定项目根路径 */
  ERROR_MAKE_PROJECT_LOCATION_FAILED: 3002,
  /** Make失败：无法正确初始化或更新CI/CD分支标记文件（ZOperate文件） */
  ERROR_MAKE_INIT_ZOPERATOR_FAILED: 3003,

  /** NPM登陆失败 */
  ERROR_NPM_LOGIN_FAILED: 4000,
  /** NPM安装失败 */
  ERROR_NPM_INSTALL_ERROR: 4001,

  /** 配置获取失败 */
  ERROR_GET_CONFIG_FAILED: 5000,
  /** 开发调试配置文件不存在 */
  ERROR_DEV_CONFIG_NOT_EXIST: 5001,
  /** 发布配置文件不存在，请检查传入的发布环境、机房信息是否争取以及对应环境下配置文件是否存在 */
  ERROR_PRO_CONFIG_NOT_EXIST: 5002,

  /** Deploy失败，重算Hash深度溢出，请检查模块间是否存在循环依赖 */
  ERROR_RECALCULATE_HASH_DEPTH_OVERFLOW: 6000,
  /** Deploy失败，重算过程中，文件未找到 */
  ERROR_RECALCULATE_FILE_NOT_FOUND: 6001,
  /** Deploy失败，拉取成品库失败，请检查发布的项目名称与版本号是否正确 */
  ERROR_DEPLOY_NAME_OR_VERSION_INVALID: 6002,

  /** 合并失败，无效的远端分支 */
  ERROR_MERGE_INVALID_FEATURE_BRANCHES: 7000,
  /** 合并失败，该项目的分支管理模式为传统模式，不支持传统模式的分之合并 */
  ERROR_MERGE_INVALID_VERSION_MODEL: 7001,
  /** 合并失败，存在文件冲突，无法完成自动合并，请手动合并 */
  ERROR_MERGE_CONFLICTED: 7002,

  /** 未知错误 */
  ERROR_UNKNOWN: -1,
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
  [ErrorCode.ERROR_REMOTE_DIR_INVALID]: '远端路径不存在，请检查您传入的远端路径是否正确！',
  [ErrorCode.ERROR_TAGS_EMPTY]:
    'Tags中无任何历史版本，此项目可能为新项目，无法依据Tags自动选定最新的原始分支版本',
  [ErrorCode.ERROR_FORK_FAILED]: 'Fork失败，原因未知',
  [ErrorCode.ERROR_DIR_STATUS_FAILED]: '获取当前文件夹状态失败',
  [ErrorCode.ERROR_DIR_ADD_FAILED]: '版本管理添加文件失败',
  [ErrorCode.ERROR_DIR_CI_FAILED]: '版本管理提交失败',
  [ErrorCode.ERROR_DIR_UPDATE_FAILED]: '版本管理更新失败',
  [ErrorCode.ERROR_IMPORT_FAILED]: '版本管理，文件导入失败',
  [ErrorCode.ERROR_GET_REMOTE_PATH_FAILED]: '获取SVN远程路径失败',
  [ErrorCode.ERROR_CAT_FAILED]: 'SVN获取文件内容失败',
  [ErrorCode.ERROR_BRANCHES_DIR_INVALID]:
    'SVN版本更新失败，无法确定项目根路径，该路径下存在多个文件夹',

  /** Release 相关错误信息 */
  [ErrorCode.ERROR_RELEASE_BRANCHES_NOT_EXIST]:
    '封板失败，未找到目标分支。您传递的branchName参数可能是错误的，请检查！',
  [ErrorCode.ERROR_RELEASE_LATEST_NOT_FOUND]:
    '封板失败，未匹配到合法的最新分支路径，请检查tags下的版本号是否符合规范',
  [ErrorCode.ERROR_RELEASE_FAILED]: '目标分支已存在，拒绝执行分支创建操作！',
  [ErrorCode.ERROR_RELEASE_DEL_FAILED]:
    '删除分支失败，请检查原始分支是否存在文件锁，解锁后手动删除原始分支（如果您执行的是封版操作，则封版操作已完成，仅仅是删除原始分支失败）！',
  [ErrorCode.ERROR_RELEASE_PACKAGE_JSON_NOT_EXIST]: '封板项目package.json文件不存在',
  [ErrorCode.ERROR_RELEASE_TAG_VERSION_INVALID]:
    '封板指定的目标版本号非法，请使用如下形式的版本号：x.x.x',
  [ErrorCode.ERROR_RELEASE_TAG_VERSION_IS_EXIST]:
    '封板的目标版本已经存在归档文件，无法进行覆盖操作，请确认指定的版本号是否正确',
  [ErrorCode.ERROR_RELEASE_NOT_UPGRADE]:
    '当前主线版本处于Release状态，不允许再次执行Release动作，请合并特性分支后再尝试Release',

  /** Make 相关错误信息 */
  [ErrorCode.ERROR_MAKE_CONF_EMPTY]: '当前项目未获取到任何有效的环境配置信息，无法完成Make构建',
  [ErrorCode.ERROR_MAKE_VERSION_GENERATE]:
    '生成持续集成版本号失败，当前应用在成品库没有历史版本，也未发现您的的主应用版本号，请正确配置您的应用package.json中的版本信息',
  [ErrorCode.ERROR_MAKE_PROJECT_LOCATION_FAILED]:
    '无法确定项目根路径，您执行的路径有误。当前路径下不存在或当前目录下存在多个子项目，无法确定您要构建的项目位置',
  [ErrorCode.ERROR_MAKE_INIT_ZOPERATOR_FAILED]:
    '无法正确初始化或更新CI/CD分支标记文件（ZOperate文件）',
  [ErrorCode.ERROR_PRO_CONFIG_NOT_EXIST]:
    '发布配置文件不存在，请检查传入的发布环境、机房信息是否争取以及对应环境下配置文件是否存在',

  /** Deploy 相关错误 */
  [ErrorCode.ERROR_RECALCULATE_HASH_DEPTH_OVERFLOW]:
    '重算Hash过程中，递归深度溢出，请检查模块间是否存在循环依赖',
  [ErrorCode.ERROR_RECALCULATE_FILE_NOT_FOUND]: '重算Hash过程中，文件未找到',
  [ErrorCode.ERROR_DEPLOY_NAME_OR_VERSION_INVALID]:
    'Deploy失败，拉取成品库失败，请检查发布的项目名称与版本号是否正确',

  /** NPM 相关错误 */
  [ErrorCode.ERROR_NPM_LOGIN_FAILED]:
    'NPM登陆失败，无法取得用户Token，无法进行成品上传等操作，请检查基础配置中的npm账号是否正确，并具备相应权限',
  [ErrorCode.ERROR_NPM_INSTALL_ERROR]:
    'NPM安装失败，请检查您要拉取的项目名、版本号是否正确，以及网络情况是否通畅',

  /** Config相关错误 */
  [ErrorCode.ERROR_GET_CONFIG_FAILED]: 'YML配置获取失败',
  [ErrorCode.ERROR_DEV_CONFIG_NOT_EXIST]:
    '启动开发调试所需的配置文件不存在，请在项目的project-config目录下新建default.yml配置文件，或使用自定义的文件名，并在启动时进行指定',

  /** Merge 相关错误 */
  [ErrorCode.ERROR_MERGE_INVALID_FEATURE_BRANCHES]:
    '合并失败，无效的远端分支，请检查合并的分支分支名称是否正确',
  [ErrorCode.ERROR_MERGE_INVALID_VERSION_MODEL]:
    '合并失败，该项目的分支管理模式为传统模式，不支持传统模式的分支合并',
  [ErrorCode.ERROR_MERGE_CONFLICTED]: '合并失败，存在文件冲突，无法完成自动合并，请手动合并',

  [ErrorCode.ERROR_UNKNOWN]: '未知错误',
};

const TipsMessage = {
  fork: '当前命令用法：stormrage fork <branchName> [projectPath] [-b|--base <baseBranchesName>]',
  release:
    '当前命令用法：stormrage release <branchName> [projectPath] [-t|--tag <tagVersion>] [--major|--minor|--patch]',
  merge: '当前命令用法：stormrage merge <branchName>',
  make:
    '当前命令用法：stormrage make [localDir] -p <projectType> -e <env> -c <conf> -f <fields> -d <localDest> --svn <url> --svn-checkout-dir <path> --no-force-svn-checkout',
  deploy:
    '当前命令用法：stormrage deploy <projectName> <env> <room> --target <targetVersion> --dest [path] --conf <configFileName> --confLabel <label>',
  env: '当前命令用法：stormrage env [localDir] [env] [room] -p <projectType> -c <conf> -f <fields>',
  start:
    '当前命令用法：stormrage start [localDir] -p <projectType> --port <port> --conf <conFileName> --output <path> -f <fields> --next',
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
