module.exports = context => {
  //开启AMD模式
  fis.hook('amd');

  // 代码修剪
  fis.match('**.{es, jsx, ts, tsx, js, css, tpl, html}', {
    parser: fis.plugin('jdists', {
      trigger: process.env.NODE_ENV === 'development' ? 'dev' : 'release',
    }),
  });

  //html文件增加类似js文件中的*__uri*资源自动定位功能函数
  fis.match('**.{html, tpl}', {
    parser: fis.plugin('html-uri', null, 'append'),
  });

  const tscConfig = {
    isJsXLike: true,
    // 要支持 es6 和 jsx， typescript 也能胜任，最主要是编译速度要快很多。
    parser: fis.plugin(
      'typescript-gmsoft',
      {
        esModuleInterop: true,
        importHelpers: true, // 使用 tslib
        sourceMap: true,
        module: 2, //1: commonjs 2: amd 3: umd 4: system
        target: 1, // 0: es3 1: es5 2: es6
      },
      'append'
    ),
    rExt: '.js',
  };

  // 文件通过 tsc 编译
  fis.match('**.{es, jsx, ts, tsx}', tscConfig);
  fis.match('/(**).{ts, tsx}', {
    moduleId: '$1',
  });
  fis.match('api/**.js', tscConfig);

  //less预处理,定义基础的css依赖(bootstrap,common),项目中不用再写了
  fis.match('**.less', {
    // fis-parser-less 插件进行解析
    useSprite: true,
    parser: fis.plugin('less-gmsoft', { modifyVars: context.config.themeVars || {} }),
    // .less 文件后缀构建后被改成 .css 文件
    rExt: '.css',
    requires: ['modules/bootstrap/css/bootstrap.css', 'css/common.less'],
  });

  //为modules, directive和app结尾的文件夹做css2js处理, css 后处理 http://www.open-open.com/lib/view/open1420118162390.html
  fis
    .match('/{modules,directive,*app}/**.{less,css}', {
      preprocessor: [
        fis.plugin('cssgrace'),
        fis.plugin('compatible-ie-css2js', {
          template: 'requirejs_runner',
        }),
      ],
      rExt: '.js',
      id: 'css2js$0',
      isMod: true,
      release: 'css2js/$0',
    })
    //以下公共模块中的css不做css2js操作,(因为这些css是第三方模块自己动态加载的)
    .match('/modules/bootstrap/**.{less,css}', {
      preprocessor: null,
      rExt: null,
      id: null,
      isMod: false,
      release: null,
    })
    .match('/modules/datePicker/skin/*/**.{less,css}', {
      preprocessor: null,
      rExt: null,
      id: null,
      isMod: false,
      release: null,
    })
    .match('/modules/umeditor/{dialogs,third-party}/**.{less,css}', {
      preprocessor: null,
      rExt: null,
      id: null,
      isMod: false,
      release: null,
    });

  //生成css延迟加载代码
  const reg = /css\s*:\s*require\(\[?([^\(\[\]\)]*)\]?\)/gim;

  fis.match('**.router.js', {
    preprocessor: function(content, file, conf) {
      if (reg.test(content)) {
        content = content.replace(
          reg,
          "resolve:{css:['$q',function($q){var deferred = $q.defer();require([$1],function(){deferred.resolve();});return deferred.promise;}]}"
        );
      }
      reg.lastIndex = 0;
      return content;
    },
  });

  //modules下面都是模块化资源
  fis
    .match(/^\/modules\/(.*)\.(js|es|jsx|ts|tsx)$/i, {
      useCache: true,
      isMod: true,
    })

    //datePicker,umeditor中的非主文件不包装define
    .match('/modules/{umeditor,datePicker}/**.js', {
      isMod: false,
    })
    .match('/modules/umeditor/umeditor.js', {
      isMod: true,
    })
    .match('/modules/umeditor/umeditor.config.js', {
      isMod: true,
    })
    .match('/modules/datePicker/datePicker.js', {
      isMod: true,
    })
    //自动增加angularjs依赖注入注解,保证压缩后的代码依赖注入不会出错
    .match(/^(?!\/modules\/)(.*)\.(js|es|ts)$/i, {
      extras: {
        isAnnotate: true,
      },
      postprocessor: fis.plugin('annotate-gmsoft', null, 'append'),
    })
    //tpl编译时使用html标准编译流程处理
    .match('**.tpl', {
      isHtmlLike: true,
      useMap: true,
    })
    //不用编译缓存
    .match(/.*\.(html|jsp|tpl|vm|htm|asp|aspx|php|less)$/, {
      useCache: false,
    });

  //静态资源前端加载器，用来分析页面中使用的和依赖的资源（js或css）, 并将这些资源做一定的优化后插入页面中。如把零散的文件合并。
  //详见: https://github.com/fex-team/fis3-postpackager-loader
  fis.match('::package', {
    // npm install [-g] fis3-postpackager-loader
    // 分析 RESOURCE_MAP 结构，来解决资源加载问题
    postpackager: fis.plugin('loader', {
      resourceType: 'amd',
      useInlineMap: false, //是否将 sourcemap 作为内嵌脚本输出。
      resourcemapWhitespace: 0,
      include: '**.{js,es,jsx,ts,tsx}',
    }),
  });

  fis
    .match('**.{js,es,jsx,ts,tsx,less,css,png,jpg,gif,tpl}', {
      // 加 md5
      useHash: true,
    })
    .match('/modules/umeditor/*/**.{css,js,gif,png,jpg}', {
      useHash: false,
    })
    .match('**.{js,es,jsx,ts,tsx}', {
      // fis-optimizer-uglify-js 插件进行压缩，已内置
      optimizer: fis.plugin('uglify-js'),
    })
    .match('**.{less,css}', {
      // 给匹配到的文件分配属性 `useSprite`
      useSprite: true,
      //压缩css
      optimizer: fis.plugin('clean-css', {
        keepBreaks: false, //不保持一个规则一个换行
      }),
    });
};
