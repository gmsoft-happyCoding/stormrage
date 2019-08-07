/**
 * 根据变量生成插件期望的格式, 交给fis3的插件做文件的变量替换
 * @param {object} vars 需要替换的变量
 * @returns {Array} fis3 变量替换插件期望的格式
 */
module.exports = function generate(vars) {
  var replaceArray = [];

  for (var key in vars) {
    if (vars.hasOwnProperty(key)) {
      replaceArray.push({
        from: new RegExp('\\$\\{' + key + '\\}', 'g'),
        to: vars[key]
      });
    }
  }

  return replaceArray;
};
