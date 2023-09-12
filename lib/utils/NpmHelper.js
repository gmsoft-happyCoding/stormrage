const axios = require('axios');
const lodash = require('lodash');
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const { ReleaseHelper } = require('./ReleaseHelper');
const { SvnHelper } = require('./SvnHelper');

class NpmHelper {
  /** 主版本号尾匹配 */
  static MAIN_VERSION_PATTERN = /(\d+\.\d+\.\d+)$/;
  /** Make版本号尾匹配 */
  static MAKE_VERSION_PATTERN = /(\d+\.\d+\.\d+)-(\d+)$/;
  /** 前端代码私有库 */
  static REGISTRY_FRONT = 'http://192.168.2.10:8081/repository/npm.gm/';
  /** 前端项目成品库 */
  static REGISTRY_PRODUCT = 'http://192.168.2.10:8081/repository/front-product/';

  constructor(user, password, registryProduct, registryFront) {
    /** 私服NPM的前端库地址 */
    this.REGISTRY_FRONT =
      registryFront ?? process.env.NPM_REGISTRY_FRONT ?? NpmHelper.REGISTRY_FRONT;
    /** 私服NPM的成品库地址 */
    this.REGISTRY_PRODUCT =
      registryProduct ?? process.env.NPM_REGISTRY_PRODUCT ?? NpmHelper.REGISTRY_PRODUCT;

    /** 私服账号密码 */
    this.user = user;
    this.password = password;
  }

  /**
   * 获取Npm用户Token
   * @returns 用户Token
   */
  async getNpmToken() {
    if (this.token) {
      return this.token;
    }
    try {
      const { data } = await axios.put(
        `${this.REGISTRY_PRODUCT}-/user/org.couchdb.user:${this.user}`,
        {
          _id: `org.couchdb.user:${this.user}`,
          name: this.user,
          password: this.password,
          type: 'user',
          roles: [],
        }
      );
      this.token = data.token;
      return this.token;
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_NPM_LOGIN_FAILED, error.message);
    }
  }

  /**
   * 获取包的Latest版本号
   * @param {string} packageName 包名
   * @param {string} mainVersion 当前应用版本号
   */
  async getLatestVersion(packageName, mainVersion = undefined) {
    let data = null;

    try {
      if (!this.token) {
        this.token = await this.getNpmToken();
      }
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_NPM_LOGIN_FAILED, error.message);
    }

    try {
      ({ data } = await axios.get(`${this.REGISTRY_PRODUCT}${packageName}`, {
        headers: {
          authorization: `Bearer ${this.token}`,
        },
      }));
    } catch (error) {
      // 如果获取不到目标版本库的版本信息，则直接返回，可能是首次发布
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
    const allSubVersion = allVersions.filter(v => v.startsWith(maxMainVersion));

    // 给定主版本号没有对应的Make版本存在，直接返回空
    if (allSubVersion.length === 0) {
      return;
    }

    // 取得最大的Make版本
    const maxMakeVersion = NpmHelper.getMaxMakeVersion(allSubVersion);
    return maxMakeVersion;
  }

  static getMaxMakeVersion(allSubVersion) {
    const versions = lodash.orderBy(
      allSubVersion.map(v => {
        const [main, make] = v.split(ReleaseHelper.rcSplitPattern);
        return [main, +make];
      }),
      ['1'],
      ['desc']
    );
    return versions[0].join('-');
  }
}

module.exports = { NpmHelper };
