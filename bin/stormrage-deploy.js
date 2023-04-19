#!/usr/bin/env node

const lodash = require('lodash');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const program = require('commander');
const { ErrorHelper } = require('../lib/utils/ErrorHelper');
const deploy = require('../lib/commands/deploy');

program
  .argument(
    '<projectName>',
    '（必须）部署的成品项目名称，前端很多项目都是复合项目，成品库一般都有前后缀名，请注意核对名称正确性'
  )
  .argument('<env>', '（必须）部署的目标环境')
  .argument('<room>', '（必须）部署的目标机房')
  .option(
    '-t, --target <targetVersion>',
    '明确指定部署所使用的成品版本，不传递，则使用最新的Latest版本'
  )
  .option(
    '-c, --conf <configFileName>',
    '明确指定部署所使用的配置文件名，带不带后缀无关紧要，CLI将尽可能去寻找'
  )
  .option('-cl, --confLabel <label>', '明确指定部署所使用的配置文件名的附加标签，默认为：1')
  .option(
    '--ignoreDir <dirs>',
    '部署时明确指定忽略进行Hash重算的目录，多个目录用逗号分隔。此选项对React项目意义不大，主要针对Fis项目，用于Deploy提速，当明确知道某些路径不存在环境变量，不需要进行Hash重算时，可以指定此选项进行跳过来加速'
  )
  .option(
    '-d, --dest [path]',
    '标识此次部署为本地部署，path为发布结果存放位置, 默认为<d:/发布结果>，不传递则尝试根据相关配置进行上传'
  )
  .action(async (projectName, env, room, opts) => {
    try {
      // 清理暂存文件夹：命令用法 stormrage deploy clear * *
      if (projectName === 'clear') {
        const deployTempDir = path.resolve(os.homedir(), 'gm-make-temp');
        console.log('[1/1] 暂存目录清理中...');
        fs.emptyDir(deployTempDir);
      } else {
        console.log('[1/6] 创建暂存目录...');
        // 产生随机目录，并重建，然后切换到随机目录作为工作空间
        const tempDir = lodash.random(0, 99999999999999).toString();
        const workDir = path.resolve(os.homedir(), 'gm-make-temp', tempDir);

        fs.removeSync(workDir);
        fs.mkdirSync(workDir, { recursive: true });
        process.chdir(workDir);

        await deploy({ projectName, env, room, opts, workDir });

        // 清理工作空间
        console.log('[*] 清理工作空间...');
        process.chdir(path.resolve(workDir, '..'));
        // 删除缓存目录
        fs.removeSync(workDir);
      }

      console.log('[DONE] Deploy 操作成功完成！');
    } catch (error) {
      console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'deploy'));
      process.chdir(path.resolve(workDir, '..'));
      // 删除缓存目录
      fs.removeSync(workDir);
      process.exit(1);
    }
  })
  .parse(process.argv);
