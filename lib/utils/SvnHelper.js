const lodash = require('lodash');
const svnUltimate = require('node-svn-ultimate');
const { UrlHelper } = require('./UrlHelper');

const judgeRule = ['tags', 'branches'];

class SvnHelper {
  constructor() {
    throw new Error('SvnHelper 为静态类，不允许实例化');
  }

  /**
   * 获取目标路径下的文件列表信息
   * @param {*} targetUrl 目标文件路径，设计上是远程路径，本地路径暂未测试
   * @returns 文件组信息
   */
  static async getList(targetUrl) {
    const fileList = await new Promise(function (resolve, reject) {
      svnUltimate.commands.list(targetUrl, (err, opt) => {
        if (!err) {
          const { list } = opt;
          return resolve(list.entry);
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
    try {
      const isProjectRootDir = await this.isProjectRootDir(targetUrl);
      if (isProjectRootDir) {
        return targetUrl;
      }
      const currentUrl = new UrlHelper(targetUrl);
      if (currentUrl.isTopUrl) {
        throw new Error('在路径上，未匹配到项目根路径');
      }
      // 将当前路径回退后继续寻找
      return await this.getProjectRootDir(currentUrl.prev().currentUrl);
    } catch (error) {
      throw new Error('获取项目根路径失败');
    }
  }
}

module.exports = { SvnHelper };
