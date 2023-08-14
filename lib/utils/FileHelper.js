const fs = require('fs');
const os = require('os');
const fse = require('fs-extra');
const lodash = require('lodash');
const path = require('path');
const crypto = require('crypto');
const { isEmpty, uniqueId } = require('lodash');

class FileHelper {
  // ============================================= 实例属性方法开始 =============================================
  /** 文件名 */
  baseName = '';
  /** 与当前文件内容同步的Hash文件名，如果文件名不符合isHashFileNamePattern的模式要求，则hashBaseName就等于baseName */
  hashBaseName = '';
  /** 上一轮的Hash文件名，当修改文件内容时，hashBaseName会自动更新，而此字段将保留hashBaseName的旧值（主要用于文件内容替换） */
  hashBaseNamePrev = '';
  /** 文件全路径 */
  filePath = '';
  /** 文件MD5签名摘要 */
  fileHash = '';
  /** 文件是否被修改 */
  isDirty = false;
  /** 文件内容 */
  __fileContent = null;
  static tempDir = 'gm-make-temp';

  constructor(filePath) {
    this.filePath = filePath;
    this.baseName = path.basename(filePath);
    this.hashBaseName = this.baseName;
    this.hashBaseNamePrev = this.baseName;
  }

  /** 初始化函数 */
  async init() {
    if (!FileHelper.isFile(this.filePath)) {
      ErrorHelper.throwError(ErrorCode.ERROR_RECALCULATE_FILE_NOT_FOUND);
    }
    this.fileContent = await FileHelper.readFileContent(this.filePath, true);
  }

  /** 文件内容setter，自动化Hash计算 */
  set fileContent(content) {
    this.fileHash = FileHelper.calculateFileMD5(content);

    // 如果当前文件内容不为空，且当前文件内容与新内容不一致，则认为文件被修改过
    if (this.__fileContent !== null && this.__fileContent !== content) {
      this.isDirty = true;
    }

    // 如果文件名符合Hash文件名模式，则需要更新文件Hash名称
    if (FileHelper.isHashFileNamePattern.test(this.baseName)) {
      this.hashBaseNamePrev = this.hashBaseName;
      this.hashBaseName = this.baseName.replace(
        FileHelper.isHashFileNamePattern,
        this.fileHash.substr(-8)
      );
    }

    this.__fileContent = content;
  }
  get fileContent() {
    return this.__fileContent;
  }

  // ============================================= 静态工具方法开始 =============================================

  // 文件是否参与Hash重算的判断模式，如果判定成功，则界定为改文件使用了Hash文件名，需要进行Hash重算，否则不需要应用Hash重算逻辑，保持原文件名即可
  static isHashFileNamePattern = /(?<=(\.|-|_))(?:[\da-f]{6,})(?=\.)/i;

  static isFile(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch (e) {
      return false;
    }
  }

  static isDir(filePath) {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取目标目录及子目录下所有文件的绝对路径
   * @param {*} dirPath 目标路径
   * @param {*} fileExt 目标文件后缀集合
   * @param {*} ignoreDir 忽略的文件夹、文件名称
   * @returns
   */
  static getAllFile(dirPath, fileExt = [], ignoreDir = []) {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    // 获取当前目录下的所有文件和文件夹，并过滤掉黑名单中的项目
    const allItems = fs.readdirSync(dirPath).filter(i => !ignoreDir.includes(i));
    /** 通过验证的文件列表 */
    const validFiles = [];
    /** 通过验证的文件夹列表 */
    const validDirs = [];

    allItems.forEach(item => {
      const itemPath = path.join(dirPath, item);
      // 如果是文件，且后缀名在目标后缀名列表中，则加入到有效文件列表中，如果没有传递过滤后缀名，则默认所有文件都是有效文件
      if (this.isFile(itemPath)) {
        if (isEmpty(fileExt) || fileExt.filter(ext => item.endsWith(ext)).length > 0) {
          validFiles.push(itemPath);
        }
      }
      // 如果是文件夹，则加入到有效文件夹列表中
      if (!this.isFile(itemPath)) {
        validDirs.push(itemPath);
      }
    });

    // 递归下级目录
    validDirs.forEach(subDir => {
      validFiles.push(...this.getAllFile(subDir, fileExt));
    });

    return validFiles;
  }

  static readFileContent(filePath, async = false) {
    if (async) {
      return fse.readFile(filePath, 'utf-8');
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  static writeFileContent(filePath, fileContent, async = false) {
    if (async) {
      fse.chmod(filePath, 0o777).then(() => fse.writeFile(filePath, fileContent, 'utf-8'));
    }
    return fs.writeFileSync(filePath, fileContent, 'utf-8');
  }

  /**
   * 计算文件的MD5值
   * @param {*} filePathOrContent 文件内容或文件地址
   * @param {*} async 是否才用异步方式
   * @returns 根据是否才用异步形式，返回文件Hash字符串或Promise<string>
   */
  static calculateFileMD5(filePathOrContent, async = false) {
    // 判断传入的是文件地址还是文件内容
    const isPath = FileHelper.isFile(filePathOrContent);

    // 计算文件Hash过程
    const calcFn = content => {
      const hash = crypto.createHash('md5');
      hash.update(content, 'utf8');
      return hash.digest('hex');
    };

    // 如果是路径，则直接计算Hash，不再读取文件，根据是否使用异步的形式，返回不同的结果，如果采用异步，则使用Promise进行包装，否则直接返回
    if (!isPath) {
      if (async) {
        return Promise.resolve(calcFn(filePathOrContent));
      }
      return calcFn(filePathOrContent);
    }

    // 异步计算
    if (async) {
      return this.readFileContent(filePathOrContent, true).then(calcFn);
    }

    // 同步计算
    const buffer = fs.readFileSync(filePathOrContent);
    return calcFn(buffer);
  }

  static deleteSourceMap(rootDir) {
    const allFile = this.getAllFile(rootDir, ['.js.map', '.css.map']);
    allFile.forEach(uri => fs.unlinkSync(uri));
  }

  static getTempDirPath() {
    let dirIsExist = false;
    let workDir = '';
    do {
      const tempDir = lodash.random(0, 99999999999999).toString();
      workDir = path.resolve(os.homedir(), this.tempDir, tempDir);
      // 如果目录已经存在，则重新生成
      dirIsExist = fs.existsSync(workDir);
    } while (dirIsExist);

    return workDir;
  }
}

class FileTreeNode {
  /** 节点ID */
  id = '';
  /** 对应文件节点 */
  fileItem = null;
  /** 依赖模块引用（此模块依赖哪些模块） */
  dependencyMap = new Map();
  /** 被依赖模块引用（此模块被哪些模块依赖） */
  byDependencyMap = new Map();

  constructor(fileItem) {
    this.id = uniqueId('id_');
    this.fileItem = fileItem;
  }
}

module.exports = { FileHelper, FileTreeNode };
