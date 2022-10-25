// 构建 fis 变量替换插件数组
function buildReplacer(opt) {
  if (!Array.isArray(opt)) {
    opt = [opt];
  }
  var r = [];
  opt.forEach(function (raw) {
    r.push(fis.plugin('replace', raw));
  });
  return r;
}

/**
 * 应用配置参数到fis
 */
module.exports = function useConf(context) {
  const { confPath, output } = context;
  const config = require('./getReplaceConfig')(confPath);
  const replaceArray = require('./replaceArrayGenerate')(config);

  if (config.ignoreFiles && config.ignoreFiles.length > 0) {
    fis.config.set(
      'project.ignore',
      config.ignoreFiles.concat(require('../../../fis-scripts/default-ignore-files'))
    );
  }

  fis.match('**', {
    deploy: buildReplacer(replaceArray).concat(fis.plugin('local-deliver', { to: output })),
  });
};
