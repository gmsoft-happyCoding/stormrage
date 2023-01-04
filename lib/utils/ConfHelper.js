const lodash = require('lodash');

class ConfHelper {
  /**
   * 将嵌套的配置对象降维成简单的环境变量配置对象，环境变量key变更为key的路径
   * @param {*} conf 需要降维的配置对象
   * @param {*} _parentKey 递归参数，外层调用时禁止传递此参数
   */
  static converConfToEnvironment(conf, _parentKey) {
    let temp = {};
    const keys = lodash.keys(conf);
    keys.forEach(key => {
      const currentKey = lodash.compact([_parentKey, key]).join('.');
      if (typeof conf[key] === 'object') {
        const result = this.converConfToEnvironment(conf[key], currentKey);
        temp = { ...temp, ...result };
        return;
      }
      temp[currentKey] = conf[key];
    });
    return temp;
  }
}

module.exports = { ConfHelper };
