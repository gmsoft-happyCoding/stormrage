const moment = require('moment');
const lodash = require('lodash');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const { configResolve } = require('../../../lib/react-scripts/utils/path-resolve');
const { ConfHelper } = require('../../utils/ConfHelper');
const fetchProject = require('../../utils/fetchProject');
const getProjectRoot = require('../../project-info/getProjectRoot');
const projectDirAsking = require('../buildAsking/projectDirAsking');
const yarnInstall = require('../../utils/yarn-install');
const zip = require('../../utils/zip');
const { ReleaseHelper } = require('../../utils/ReleaseHelper');
const { EnvHelper } = require('../../utils/EnvHelper');
const { NpmHelper } = require('../../utils/NpmHelper');
const { execSync } = require('child_process');
const { DeployHelper } = require('../../utils/DeployHelper');
const { isFisProject } = require('../../project-info/isProject');
const createZOperator = require('./createZoperator');
const packageType = require('../../project-info/packageType');
const { LogHelper } = require('../../utils/LogHelper');

async function make({ localDir, opts }) {
  // 如果传递了本地Make目录则使用本地Make目录，否则使用当前执行目录
  let rootDir = localDir || process.cwd();

  // SVN参数优先，如果使用SVN参数则进行项目迁出，并使用迁出的临时目录作为Make目录
  if (opts.svn) {
    rootDir = await fetchProject(opts.svn, opts.svnCheckoutDir, opts.forceSvnCheckout);
  }

  // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
  const baseConf = await ConfHelper.getBaseConfig();

  // 创建CI集成所需的配置文件并导入到SVN
  await createZOperator(baseConf, rootDir);

  // 询问项目根目录位置
  const projectDirAnswers = await projectDirAsking(rootDir, opts.package);

  // 获取当前打包项目根目录（如果是mono项目，则会转到打包的子项目根路径下，如果是普通单包项目，则路径同rootDir）
  const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  // 依赖安装
  yarnInstall();

  // =====================================================================================================
  // 配置获取与环境变量处理

  // 获取到所有的机房信息
  const rooms = ConfHelper.getAllRoom(baseConf);

  // 取得最终环境变量表
  const { envConf: fullEnvConf, originalEnvConf } = await ConfHelper.getFullEnvConf({
    rootDir: projectRoot,
    rooms,
    confName: opts.conf,
    envName: opts.env,
    envField: opts.field,
  });

  console.log(chalk.magenta('=========================== 环境变量 ==========================='));
  console.log(fullEnvConf);

  // 将配置写进环境变量
  const conflictEnv = EnvHelper.writeEnv(fullEnvConf);

  // 如果发现环境变量冲突，给出警告信息
  if (!lodash.isEmpty(conflictEnv)) {
    console.log(
      chalk.yellow(
        '[WARN] 发现环境变量冲突，配置文件定义的环境变量与已有环境变量存在冲突，已使用配置的环境变量对已存在的环境变量进行覆盖。应尽量避免这种情况发生，冲突的环境变量如下：%s',
        conflictEnv.join('\n')
      )
    );
  }

  // 项目的package.json信息
  const projectInfo = fs.readJSONSync(path.resolve(projectRoot, ConfHelper.PROJECT_META_FILE));
  // 构建项目类型，如果projectDirAnswers.package有值，则为mono项目选定的子项目，否则为Fis项目，或独立的App、Component子项目
  let projectType = packageType.packageType.APP;
  if (projectDirAnswers.package) {
    projectType = projectDirAnswers.package;
  }
  if (projectInfo.isComponents) {
    projectType = packageType.packageType.COMPONENTS;
  }

  // React与fis的编译临时路径策略不同，分别赋值
  let buildDir = '';
  // =====================================================================================================
  // 编译打包，按项目类型进行编译打包
  if (isFisProject(projectRoot)) {
    const currDirName = path.basename(process.cwd());
    buildDir = path.resolve(os.tmpdir(), currDirName);
    await require('../../fis-scripts/build-and-deploy-next')(fullEnvConf, buildDir);
  } else {
    const paths = require(configResolve('paths'));
    buildDir = paths.appBuild;
    await require('../../react-scripts/build-script');

    const isComponentsProject = projectType === packageType.packageType.COMPONENTS;
    // 生成项目文档
    if (isComponentsProject) {
      LogHelper.printSegment('doc build');
      execSync('yarn styleguidist build', {
        stdio: 'inherit',
        env: process.env,
      });

      LogHelper.printSegment('gen meta');
      require('../../react-scripts/gen-meta-script');
    }
  }

  // ================================================== 向目标目录释放Make过程的Meta信息，为后续的相关流程提供Make信息 ==================================================
  // 项目描述文件路径
  const filePath = path.resolve(buildDir, ConfHelper.PROJECT_META_FILE);
  // 当前项目名称：如果从配置文件能够获取到，则从配置文件取，否则使用package.json中的name字段
  const projectName = lodash.get(
    originalEnvConf,
    `${ConfHelper.CONF_DEFAULT_FIELD_NAME}.project-name`,
    projectInfo.name
  );
  // 项目版本号
  const projectVersion = projectInfo.version;
  // Make时间，将写入目标文件的package.json中
  const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
  const npmHelper = new NpmHelper(baseConf.npm.user, baseConf.npm.passwd);

  // 获取当前的最新成品包的version信息
  const latestMakeVersion = await npmHelper.getLatestVersion(projectName, projectVersion);
  // 构建下一个Make版本号
  const makeVersion = ReleaseHelper.getMakeNextVersion(latestMakeVersion, projectVersion);

  // 将描述信息重新写出
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      // 默认使用配置文件中的project-name作为项目名，如果取不到，则使用项目的package.json中的那么作为项目名称
      name: projectName,
      version: makeVersion,
      // 环境变量占位映射表
      envMap: fullEnvConf,
      // Make执行时间
      makeTime: timeStr,
      publishConfig: {
        registry: npmHelper.REGISTRY_PRODUCT,
      },
      // 打包项目类型，此字段在Deploy阶段，决定目标文件上传到什么位置
      type: projectType,
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
    process.env.NPM_AUTH_TOKEN = await npmHelper.getNpmToken();
    // 设置携带Token
    execSync('npm config set always-auth=true');
    // 执行发布
    execSync('npm publish');
  }

  console.log(chalk.magenta(`Make 版本号：${makeVersion}`));
  console.log(chalk.green('[DONE] Make 操作成功完成!'));
}

module.exports = make;
