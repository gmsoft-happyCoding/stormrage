/**
 * 根据变量生成插件期望的格式, 交给fis3的插件做文件的变量替换
 * @param {object} config 需要替换的变量
 * @returns {Array} fis3 变量替换插件期望的格式
 */
module.exports = function generate(config) {
  var replaceArray = [];

  return config.map(({ from, to }) => ({
    from: new RegExp(from, 'g'),
    to,
  }));
};
