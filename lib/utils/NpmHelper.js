const axios = require('axios');
const lodash = require('lodash');
const { SvnHelper } = require('./SvnHelper');

class NpmHelper {
  /** 私服NPM的成品库地址 */
  static REGISTRY_PRODUCT =
    process.env.NPM_REGISTRY_PRODUCT ?? 'http://192.168.2.10:8081/repository/front-product/';
  /** 私服NPM的前端库地址 */
  static REGISTRY_FRONT =
    process.env.NPM_REGISTRY_FRONT ?? 'http://192.168.2.10:8081/repository/npm.gm/';
  static REGISTRY_TOKEN = 'Bearer NpmToken.78c3b93d-1084-3c4f-862b-56574af554c8';

  /**
   * 获取包的Latest版本号
   * @param {string} packageName 包名
   * @param {string} mainVersion 当前应用版本号
   */
  static async getLatestVersion(packageName, mainVersion = undefined) {
    let data = null;
    try {
      ({ data } = await axios.get(`${this.REGISTRY_PRODUCT}${packageName}`, {
        headers: {
          authorization: this.REGISTRY_TOKEN,
        },
      }));
    } catch (error) {
      return;
    }

    let latest = data['dist-tags'].latest;
    // 如果存在Latest标记版本且没有指定主要版本号，则直接返回最后的版本
    if (latest && !mainVersion) {
      return latest;
    }
    const allVersions = Object.keys(data.versions);
    // 未发现Latest标记版本，从versions中进行获取
    const maxMainVersion = mainVersion
      ? mainVersion
      : SvnHelper.getMaxVersion(allVersions.map(v => v.replace(/-.*$/, '')));
    // 取得大版本下的所有Make版本号
    const allSubVersion = allVersions.filter(v => v.includes(maxMainVersion));
    // 取得最大的Make版本
    const maxMakeVersion = this.getMaxMakeVersion(allSubVersion);
    return maxMakeVersion;
  }

  static getMaxMakeVersion(allSubVersion) {
    const versions = lodash.orderBy(
      allSubVersion.map(v => v.split('-')),
      ['1'],
      ['desc']
    );

    return versions[0].join('-');
  }
}

module.exports = { NpmHelper };
