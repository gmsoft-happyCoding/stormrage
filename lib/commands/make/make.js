const yaml = require('js-yaml');
const axios = require('axios');
const lodash = require('lodash');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const { configResolve } = require('../../../lib/react-scripts/utils/path-resolve');
const { ErrorHelper } = require('../../utils/ErrorHelper');
const { ConfHelper } = require('../../utils/ConfHelper');
const fetchProject = require('../../utils/fetchProject');
const getProjectRoot = require('../../project-info/getProjectRoot');
const projectDirAsking = require('../buildAsking/projectDirAsking');
const yarnInstall = require('../../utils/yarn-install');
const { isFisProject } = require('../../project-info/isProject');
const zip = require('../../utils/zip');

async function make({ localDir, opts }) {
  try {
    // 如果传递了本地Make目录则使用本地Make目录，否则使用当前执行目录
    let rootDir = localDir || process.cwd();

    // SVN参数优先，如果使用SVN参数则进行项目迁出，并使用迁出的临时目录作为Make目录
    if (opts.svn) {
      rootDir = await fetchProject(opts.svn, opts.svnCheckoutDir, opts.forceSvnCheckout);
    }

    // 询问项目根目录位置
    const projectDirAnswers = await projectDirAsking(rootDir, opts.package);

    // 获取项目根目录
    const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

    // 切换工作目录到项目根目录
    process.chdir(projectRoot);

    // // Fis项目分流
    // if (isFisProject(projectRoot)) {
    //   console.log('return');
    //   return;
    // }

    // 依赖安装
    // yarnInstall();

    // =====================================================================================================

    // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
    const baseConf = await ConfHelper.getBaseConfig();
    // const rooms = ConfHelper.getAllRoom(baseConf);
    // TODO 开发临时过滤
    const rooms = ConfHelper.getAllRoom(baseConf).filter(i => ['xcj', 'zcj'].includes(i));

    // 取得最终环境变量表，写入环境变量
    const fullEnvConf = await ConfHelper.getFullEnvConf(rootDir, rooms);

    console.log(chalk.magenta('=========================== 环境变量 ==========================='));
    console.log(fullEnvConf);

    // // 将配置写进环境变量
    for (const k in fullEnvConf) {
      if (Object.hasOwnProperty.call(fullEnvConf, k)) {
        const v = fullEnvConf[k];
        if (Object.hasOwnProperty.call(process.env, k)) {
          console.log('发现环境变量冲突，此次打包的产出可能会出现意外的结果，请注意！');
        }
        process.env[k] = v;
      }
    }

    // =====================================================================================================
    // 编译打包
    await require('../../react-scripts/build-script');

    // 向目标目录释放Make过程的Meta信息，为后续的相关流程提供Make信息
    const paths = require(configResolve('paths'));
    const buildDir = paths.appBuild;
    const filePath = path.resolve(buildDir, 'ci-meta.json');
    const projectInfo = fs.readJSONSync(path.resolve(projectRoot, 'package.json'));
    const nowDate = new Date();
    const timeStr = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${
      nowDate.getDay() + 1
    }T${nowDate.getHours()}-${nowDate.getMinutes()}-${nowDate.getSeconds()}`;
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        // 环境变量占位映射表
        envMap: fullEnvConf,
        // 项目版本号
        projectVersion: projectInfo.version,
        // 持续集成的make版本号
        makeVersion: `${projectInfo.version}-CI-${timeStr}`,
      })
    );

    // 将目标产物打包，输出到指定位置
    await zip(buildDir, opts.dest);

    console.log('[DONE] Make 操作成功完成!');
  } catch (error) {
    console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
  }
}

module.exports = make;
