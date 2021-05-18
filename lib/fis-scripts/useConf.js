const path = require('path');
const { getMachineInfo } = require('../deployInfo');

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
 * 应用配置参数到fis media
 */
module.exports = function useConf(context) {
  const { config, output, env, room } = context;
  const replaceArray = require('./utils/repaceArrayGenerate')(config.vars);
  const media = fis.media(context.mediaName);

  if (config.ignoreFiles) fis.config.set('project.ignore', config.ignoreFiles);

  // 不对文件名做hash处理
  if (config.notUseHash) {
    media.match('**.{js,es,jsx,ts,tsx,less,css,png,jpg,gif,tpl}', {
      useHash: false,
    });
  }

  // 不压缩js
  if (config.notOptimizeJs) {
    media.match('**.{js,es,jsx,ts,tsx}', {
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

  let deployPlugins = [];

  switch (config.deploy.type) {
    case 'local':
      deployPlugins.push(
        fis.plugin('local-deliver', { to: path.join(output, config.deploy.subPath || '') })
      );
      break;
    case 'zip':
    case 'scp':
      deployPlugins.push(fis.plugin('skip-packed'));
      deployPlugins.push(fis.plugin('local-deliver', { to: output }));
      break;
  }

  // 部署配置
  media.match('**', {
    deploy: deployPlugins,
  });

  // 替换 project var
  media.match('**', {
    parser: fis.plugin('replacer', { rules: replaceArray }, 'prepend'),
  });
};
