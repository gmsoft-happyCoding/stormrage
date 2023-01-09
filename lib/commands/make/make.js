const moment = require('moment');
const lodash = require('lodash');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const { exec } = require('node:child_process');
const { configResolve } = require('../../../lib/react-scripts/utils/path-resolve');
const { ErrorHelper } = require('../../utils/ErrorHelper');
const { ConfHelper } = require('../../utils/ConfHelper');
const fetchProject = require('../../utils/fetchProject');
const getProjectRoot = require('../../project-info/getProjectRoot');
const projectDirAsking = require('../buildAsking/projectDirAsking');
const yarnInstall = require('../../utils/yarn-install');
const zip = require('../../utils/zip');
const { ReleaseHelper } = require('../../utils/ReleaseHelper');
const { NpmHelper } = require('../../utils/NpmHelper');
const { execSync } = require('child_process');
const { DeployHelper } = require('../../utils/DeployHelper');

async function make({ localDir, opts }) {
  // const latestMakeVersion = await NpmHelper.getLatestVersion('app-online-assessment');
  // console.log('latestMakeVersion: ', latestMakeVersion);
  // const makeVersion = ReleaseHelper.getMakeNextVersion(latestMakeVersion, '1.0.1');
  // console.log('makeVersion: ', makeVersion);
  // return;

  try {
    // 如果传递了本地Make目录则使用本地Make目录，否则使用当前执行目录
    let rootDir = localDir || process.cwd();

    // SVN参数优先，如果使用SVN参数则进行项目迁出，并使用迁出的临时目录作为Make目录
    if (opts.svn) {
      rootDir = await fetchProject(opts.svn, opts.svnCheckoutDir, opts.forceSvnCheckout);
    }

    // 询问项目根目录位置
    const projectDirAnswers = await projectDirAsking(rootDir, opts.package);

    // 获取当前打包项目根目录（如果是mono项目，则会转到打包的子项目根路径下，如果是普通单包项目，则路径同rootDir）
    const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

    // 切换工作目录到项目根目录
    process.chdir(projectRoot);

    // 依赖安装
    yarnInstall();

    // =====================================================================================================

    // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
    const baseConf = await ConfHelper.getBaseConfig();
    // const rooms = ConfHelper.getAllRoom(baseConf);
    // FIXME 开发临时过滤，注意还原
    const rooms = ConfHelper.getAllRoom(baseConf).filter(i => ['xcj', 'zcj'].includes(i));

    // 取得最终环境变量表，写入环境变量
    const fullEnvConf = await ConfHelper.getFullEnvConf({
      rootDir,
      rooms,
      confName: opts.conf,
      envName: opts.env,
      envField: opts.field,
      // 如果是mono项目，需要根据发布的类型，获取不同的配置文件
      projectType: projectDirAnswers.package,
    });

    console.log(chalk.magenta('=========================== 环境变量 ==========================='));
    console.log(fullEnvConf);

    // 将配置写进环境变量
    const conflictEnv = [];
    for (const k in fullEnvConf) {
      if (Object.hasOwnProperty.call(fullEnvConf, k)) {
        const v = fullEnvConf[k];
        if (Object.hasOwnProperty.call(process.env, k)) {
          conflictEnv.push(k);
        }
        process.env[k] = v;
      }
    }

    // 如果发现环境变量冲突，给出警告信息
    if (!lodash.isEmpty(conflictEnv)) {
      console.log(
        chalk.yellow(
          '[WARN] 发现环境变量冲突，配置文件定义的环境变量与已有环境变量存在冲突，已使用配置的环境变量对已存在的环境变量进行覆盖。应尽量避免这种情况发生，冲突的环境变量如下：%s',
          conflictEnv.join('\n')
        )
      );
    }

    // =====================================================================================================
    // 编译打包
    await require('../../react-scripts/build-script');

    // 向目标目录释放Make过程的Meta信息，为后续的相关流程提供Make信息
    const paths = require(configResolve('paths'));
    const buildDir = paths.appBuild;
    const filePath = path.resolve(buildDir, ConfHelper.PROJECT_META_FILE);
    const projectInfo = fs.readJSONSync(path.resolve(projectRoot, ConfHelper.PROJECT_META_FILE));
    const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
    // 获取当前的最新成品包的version信息
    const latestMakeVersion = await NpmHelper.getLatestVersion(
      projectInfo.name,
      projectInfo.version
    );
    const makeVersion = ReleaseHelper.getMakeNextVersion(latestMakeVersion, projectInfo.version);
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        ...lodash.pick(projectInfo, ['name']),
        version: makeVersion,
        // 环境变量占位映射表
        envMap: fullEnvConf,
        // Make执行时间
        makeTime: timeStr,
        publishConfig: {
          registry: NpmHelper.REGISTRY_PRODUCT,
        },
      })
    );

    // 如果存在dest，则直接打包到本地即可
    if (opts.dest) {
      // 将目标产物打包，输出到指定位置，现在打包编译就没有环境与机房的概念了，直接放置到目的地即可，不再按环境+机房子目录放置
      await zip(
        buildDir,
        typeof opts.dest === 'string' ? opts.dest : DeployHelper.DEFAULT_LOCAL_DEST_DIR
      );
    } else {
      // 切换工作目标到build目录
      process.chdir(buildDir);
      // 将身份口令写到环境变量
      process.env.NPM_AUTH_TOKEN = NpmHelper.REGISTRY_TOKEN;
      // 执行发布
      execSync('npm publish');
    }

    console.log(chalk.magenta(`版本号：${makeVersion}`));
    console.log(chalk.green('[DONE] Make 操作成功完成!'));
  } catch (error) {
    console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
  }
}

module.exports = make;
