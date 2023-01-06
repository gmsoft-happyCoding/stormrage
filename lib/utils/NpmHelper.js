const { exec } = require('child_process');

class NpmHelper {
  /** 私服NPM的成品库地址 */
  static REGISTRY_PRODUCT =
    process.env.NPM_REGISTRY_PRODUCT ?? 'http://192.168.2.10:8081/repository/front-product/';
  /** 私服NPM的前端库地址 */
  static REGISTRY_FRONT =
    process.env.NPM_REGISTRY_FRONT ?? 'http://192.168.2.10:8081/repository/npm.gm/';

  /**
   * 获取包的Latest版本号
   * @param {string} packageName 包名
   */
  static async getLatestVersion(packageName) {
    console.log('packageName: ', packageName);

    exec(`yarn info ${packageName}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  }
}

module.exports = { NpmHelper };
