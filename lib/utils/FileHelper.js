const fs = require('fs');
const path = require('path');

class FileHelper {
  static isFile(filePath) {
    return fs.statSync(filePath).isFile();
  }

  /**
   * 获取目标目录及子目录下所有文件的绝对路径
   * @param {*} dirPath 目标路径
   * @param {*} fileExt 目标文件后缀集合
   * @param {*} ignoreDir 忽略的文件夹、文件名称
   * @returns
   */
  static getAllFile(dirPath, fileExt = [], ignoreDir = []) {
    // 获取当前目录下的所有文件和文件夹，并过滤掉黑名单中的项目
    const allItems = fs.readdirSync(dirPath).filter(i => !ignoreDir.includes(i));
    /** 通过验证的文件列表 */
    const validFiles = [];
    /** 通过验证的文件夹列表 */
    const validDirs = [];

    allItems.forEach(item => {
      const itemPath = path.join(dirPath, item);
      // 如果是文件，且后缀名在目标后缀名列表中，则加入到有效文件列表中
      if (this.isFile(itemPath) && fileExt.filter(ext => item.endsWith(ext)).length > 0) {
        validFiles.push(itemPath);
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

  static readFileContent(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  static writeFileContent(filePath, fileContent) {
    fs.chmodSync(filePath, 0o777);
    return fs.writeFileSync(filePath, fileContent, 'utf-8');
  }
}

module.exports = { FileHelper };
