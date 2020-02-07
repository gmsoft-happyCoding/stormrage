// 构建 fis 变量替换插件数组
function buildReplacer(opt) {
  if (!Array.isArray(opt)) {
    opt = [opt];
  }
  var r = [];
  opt.forEach(function(raw) {
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
  const replaceArray = require('./repaceArrayGenerate')(config);

  if (config.ignoreFiles)
    fis.config.set('project.ignore', [
      '@types/**',
      'target/**',
      '.idea/**',
      '*.bat',
      '*.zip',
      '.docz/**',
      'node_modules/**',
      '**/README.md',
      '**/component.json',
      'project-conf/**/**.js',
      'fis-conf.js',
    ]);

  let plugins = [];

  fis.match('**', {
    deploy: buildReplacer(replaceArray).concat(fis.plugin('local-deliver', { to: output })),
  });
};
