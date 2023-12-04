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
const {
  isFisProject,
  isMonoProject,
  isProject,
  isSubProject,
} = require('../../project-info/isProject');
const createZOperator = require('./createZoperator');
const packageType = require('../../project-info/packageType');
const { LogHelper } = require('../../utils/LogHelper');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');
const { getMakeMate } = require('./getMakeMeta');

async function make({ localDir, opts }) {
  const {
    install,
    reinstall,
    svn,
    svnCheckoutDir,
    forceSvnCheckout,
    package,
    conf,
    env,
    field,
    dest,
  } = opts || {};
  let rootDir = localDir || process.cwd();

  // 如果传递了本地Make目录则使用本地Make目录，否则使用当前执行目录
  if (!isProject(rootDir) && !svn) {
    // 获取rootDir下所有文件夹
    const dirs = fs
      .readdirSync(rootDir)
      .filter(dir => !['.svn'].includes(dir) && !dir.startsWith('.'))
      .filter(dir => fs.statSync(path.join(rootDir, dir)).isDirectory());
    // 如果dirs只有一个，则将当前工作路径切换到该目录下
    if (dirs.length === 1) {
      rootDir = path.join(rootDir, dirs[0]);
    } else {
      ErrorHelper.throwError(ErrorCode.ERROR_MAKE_PROJECT_LOCATION_FAILED);
    }
  }

  // SVN参数优先，如果使用SVN参数则进行项目迁出，并使用迁出的临时目录作为Make目录
  if (svn) {
    rootDir = await fetchProject(svn, svnCheckoutDir, forceSvnCheckout);
  }

  console.log('[INFO] 获取基础配置...');
  // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
  const baseConf = await ConfHelper.getBaseConfig();

  // 判断当前项目根路径，进行依赖安装
  if (isProject(rootDir)) {
    // 子项目不需要关心依赖安装问题
    if (!isSubProject(rootDir)) {
      // 强制重装依赖：删除所有原有依赖，重新拉取
      if (reinstall) {
        console.log('[INFO] 强制重装，删除依赖中...');
        const nodeModules = path.join(rootDir, 'node_modules');
        const packagesDir = path.join(rootDir, 'packages');
        if (fs.existsSync(nodeModules)) {
          fs.removeSync(nodeModules);
        }
        if (fs.existsSync(packagesDir)) {
          const removeTask = [];
          removeTask.push(fs.remove(path.join(packagesDir, 'app', 'node_modules')));
          removeTask.push(fs.remove(path.join(packagesDir, 'common', 'node_modules')));
          removeTask.push(fs.remove(path.join(packagesDir, 'components', 'node_modules')));
          await Promise.all(removeTask);
        }
      }

      console.log('[INFO] 依赖安装中...');
      process.chdir(rootDir);
      await yarnInstall(install, rootDir);
    }
  } else {
    ErrorHelper.throwError(ErrorCode.ERROR_MAKE_PROJECT_LOCATION_FAILED);
  }

  // 如果是复合React项目且没有指定Make的子项目，则依次进行App、Components打包
  if (isMonoProject(rootDir) && !package) {
    console.log('[INFO] 进入React复合项目打包流程...');
    const options = process.argv.slice(2);
    // 如果有--plugin-option参数，则将其转换为JSON字符串，透传的字符串参数不处理将会导致错误
    const pluginIndex = options.indexOf('--plugin-option');
    if (pluginIndex > -1 && options[pluginIndex + 1] !== undefined) {
      options[pluginIndex + 1] = JSON.stringify(options[pluginIndex + 1]);
    }

    // 需要在子项目移除的入参，这些参数在主项目中已经处理过了，不需要再次处理
    const removeOptions = ['--svn', '--reinstall', '--install'];

    // 寻找参数是否具备svn参数，如果具备SVN参数，需要进行移除，不能携带SVN参数进行嵌套调用，因为在外层，已经完成了SVN的拉取动作，无需再次进行SVN的拉取
    // linux与windows对CLI参数的处理不一样，需要区分处理
    const isLinux = os.platform() === 'linux';
    // 判断当前环境是不是Linux
    if (isLinux) {
      // linux环境
      removeOptions.forEach(opt => {
        const optIndex = options.findIndex(i => i.includes(opt));
        if (optIndex >= 0) {
          options.splice(optIndex, 1);
        }
      });
    } else {
      // 非Linux环境
      removeOptions.forEach(opt => {
        const optIndex = options.indexOf(opt);
        if (optIndex >= 0) {
          options.splice(optIndex, 2);
        }
      });
    }

    console.log('[INFO] App打包中...');
    // 打包App
    execSync(`stormrage make ${rootDir} -p app ${options.join(' ')}`, {
      stdio: 'inherit',
      env: {
        NODE_ENV: 'production',
      },
    });

    console.log('[INFO] Components打包中...');
    // 打包Components
    execSync(`stormrage make ${rootDir} -p components ${options.join(' ')}`, {
      stdio: 'inherit',
      env: {
        NODE_ENV: 'production',
      },
    });
    return;
  }

  // 询问项目根目录位置
  const projectDirAnswers = await projectDirAsking(rootDir, package);

  // 获取当前打包项目根目录（如果是mono项目，则会转到打包的子项目根路径下，如果是普通单包项目，则路径同rootDir）
  const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);
  // 切换工作空间到编译根目录
  process.chdir(projectRoot);

  // =====================================================================================================
  // 配置获取与环境变量处理

  // console.log('[INFO] 机房信息获取中...');
  // 获取到所有的机房信息
  // const rooms = ConfHelper.getAllRoom(baseConf);

  console.log('[INFO] 构建环境变量...');
  // 取得最终环境变量表（使用本地配置文件进行打包环境变量声明）
  const { envConf: fullEnvConf, originalEnvConf } = await ConfHelper.getProjectDefaultConf(
    {
      rootDir: projectRoot,
      confName: conf,
    },
    // 启用Make编译插件
    true
  );
  // 取得最终环境变量表（使用Test1配置文件进行打包环境变量声明）
  // const { envConf: fullEnvConf, originalEnvConf } = await ConfHelper.getFullEnvConf(
  //   {
  //     rootDir: projectRoot,
  //     rooms,
  //     confName: conf,
  //     envName: env,
  //     envField: field,
  //   },
  //   // 启用Make编译插件
  //   true
  // );

  console.log(chalk.magenta('=========================== 环境变量 ==========================='));
  console.log(fullEnvConf);

  // 将配置写进环境变量
  const conflictEnv = EnvHelper.writeEnv(fullEnvConf);

  // 如果发现环境变量冲突，给出警告信息
  if (!lodash.isEmpty(conflictEnv)) {
    console.log(
      chalk.yellow(
        '[WARN] 发现环境变量冲突，配置文件定义的环境变量与已有环境变量存在冲突，已使用配置的环境变量对已存在的环境变量进行覆盖。应尽量避免这种情况发生，冲突的环境变量如下：',
        conflictEnv.join(',')
      )
    );
  }

  // 项目的package.json信息
  const projectInfo = fs.readJSONSync(path.resolve(projectRoot, ConfHelper.PROJECT_META_FILE));
  // 项目打包Meta信息
  const metaInfo = await getMakeMate({ originalEnvConf, projectInfo, baseConf });

  // 创建CI集成所需的配置文件并导入到SVN
  await createZOperator(baseConf, rootDir, originalEnvConf);

  // 构建项目类型，如果projectDirAnswers.package有值，则为mono项目选定的子项目，否则为Fis项目，或独立的App、Component子项目
  let projectType = packageType.packageType.APP;
  if (projectDirAnswers.package) {
    projectType = projectDirAnswers.package;
  }
  if (projectInfo.isComponents) {
    projectType = packageType.packageType.COMPONENTS;
  }

  console.log('[INFO] 编译构建开始...');
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
      LogHelper.printSegment('组件文档构建');
      execSync('yarn styleguidist build', {
        stdio: 'inherit',
        env: process.env,
      });

      LogHelper.printSegment('组件描述构建');
      require('../../react-scripts/gen-meta-script');
    }
  }

  console.log('[INFO] 编译构建完成，开始写出构建摘要信息...');

  // ================================================== 向目标目录释放Make过程的Meta信息，为后续的相关流程提供Make信息 ==================================================
  // 项目描述文件路径
  const filePath = path.resolve(buildDir, ConfHelper.PROJECT_META_FILE);

  // 将描述信息重新写出
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      // 默认使用配置文件中的project-name作为项目名，如果取不到，则使用项目的package.json中的那么作为项目名称
      name: metaInfo.projectName,
      version: metaInfo.makeVersion,
      // 环境变量占位映射表
      envMap: fullEnvConf,
      // Make执行时间
      makeTime: metaInfo.timeStr,
      publishConfig: {
        registry: metaInfo.npmHelper.REGISTRY_PRODUCT,
      },
      // 打包项目类型，此字段在Deploy阶段，决定目标文件上传到什么位置
      type: projectType,
    })
  );

  // 项目默认配置文件写出
  const defaultConfFilePath = path.resolve(buildDir, ConfHelper.PROJECT_DEFAULT_CONF_FILE);

  // 将默认配置文件写出
  fs.writeFileSync(defaultConfFilePath, JSON.stringify(originalEnvConf));

  console.log('[INFO] 打包/发布中...');

  // 如果存在dest，则直接打包到本地即可
  if (dest) {
    // 将目标产物打包，输出到指定位置，现在打包编译就没有环境与机房的概念了，直接放置到目的地即可，不再按环境+机房子目录放置
    await zip(buildDir, typeof dest === 'string' ? dest : DeployHelper.DEFAULT_LOCAL_DEST_DIR);
  } else {
    // 切换工作目标到build目录
    process.chdir(buildDir);
    const NPM_AUTH_TOKEN = await metaInfo.npmHelper.getNpmToken();
    // 写出npmrc配置文件
    execSync(
      `npm config set ${NpmHelper.REGISTRY_PRODUCT.replace(
        'http:',
        ''
      )}:_authToken=${NPM_AUTH_TOKEN}`
    );
    // 设置携带Token
    execSync('npm config set always-auth=true');
    // 执行发布，带环境变量
    execSync('npm publish', {
      env: { NPM_AUTH_TOKEN },
    });
  }

  console.log(chalk.magenta(`Make 版本号：${metaInfo.makeVersion}`));
  console.log(chalk.green('[DONE] Make 操作成功完成!'));
}

module.exports = make;