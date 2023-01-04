#!/usr/bin/env node

const program = require('commander');
const make = require('../lib/commands/make');

program
  .argument('[localDir]', '（可选）要打包的本地路径，默认为当前执行目录')
  .option('-p, --package <package>', 'react项目为mono仓库时, 指定要发布的package')
  .option('-d, --dest [path]', '标识此次为本地Make，path为发布结果存放位置, 默认为<d:/发布结果>')
  .option('--svn <url>', '通过svn url指定需要发布的项目, 优先级高于 [project]')
  .option('--svn-checkout-dir <path>', 'svn拉取的源代码存放的地址, 默认为用户目录')
  .option(
    '--no-force-svn-checkout',
    '使用svn选项时, 若已有项目缓存, 不执行checkout操作, 直接使用缓存'
  )
  .action((localDir, opts) => {
    make({
      localDir,
      opts: { ...opts, dest: opts.dest ?? 'D:\\发布结果' },
    });
  })
  .parse(process.argv);
