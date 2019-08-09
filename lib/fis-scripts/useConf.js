const path = require('path');
const { getMachineInfo } = require('../deployInfo');

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
 * 应用配置参数到fis media
 */
module.exports = function useConf(context) {
  const { config, output, env, room } = context;
  const replaceArray = require('./utils/repaceArrayGenerate')(config.vars);
  const media = fis.media(context.mediaName);

  if (config.ignoreFiles) fis.config.set('project.ignore', config.ignoreFiles);

  // 不对文件名做hash处理
  if (config.notUseHash) {
    media.match('**.{js,es,jsx,less,css,png,jpg,gif,tpl}', {
      useHash: false,
    });
  }

  // 不压缩js
  if (config.notOptimizeJs) {
    media.match('**.{js,es,jsx}', {
      optimizer: null,
    });
  }

  // 不压缩css
  if (config.notOptimizeCss) {
    media.match('**.{less,css}', {
      useSprite: true,
      //压缩css
      optimizer: null,
    });
  }

  // 设置域和子路径
  if (config.domain) {
    media.match('**', {
      domain: config.domain,
    });
  }

  // 是否打包
  if (config.pack && config.packConf) {
    media.match('::packager', {
      packager: fis.plugin('deps-pack', config.packConf),
    });
  }

  let plugins = [];

  switch (config.deploy.type) {
    case 'local':
      plugins.push(
        fis.plugin('local-deliver', { to: path.join(output, config.deploy.subPath || '') })
      );
      break;
    case 'zip':
    case 'scp':
      plugins.push(fis.plugin('skip-packed'));
      plugins.push(fis.plugin('local-deliver', { to: output }));
      break;
  }

  media.match('**', {
    deploy: buildReplacer(replaceArray).concat(plugins),
  });
};
