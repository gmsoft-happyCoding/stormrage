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

    // Fis项目分流
    if (isFisProject(projectRoot)) {
      return;
    }

    // 依赖安装
    yarnInstall();

    // =====================================================================================================

    // 环境变量处理
    const { data: confStr } = await axios.get(
      'http://192.168.2.10:9110/test1(_)zcj/zcjfonlineassessment-1.yml'
    );
    const conf = yaml.load(confStr, 'utf8');
    // 将某些预设的配置段枚举出来，环境变量仅加载这些配置段，因为前后端的配置并没有进行分离，因此全量的配置信息过于庞杂
    // 仅加载对前端来说有意义的某些预设端，前端的配置文件需要按照预设表进行配置才能进入环境变量中
    // TODO 此处的环境变量枚举表应该提供自行指定的能力
    const envWhiteList = ['business', 'hosts', 'gateway', 'pdf-preview'];
    const targetConf = lodash.pick(conf, envWhiteList);
    const ENV_SUFFIX = '.ci_env_suffix';
    // 将环境变量降维展开成一维结构
    let envConf = ConfHelper.converConfToEnvironment(targetConf);
    envConf = lodash.mapValues(envConf, (_, k) => `${k}${ENV_SUFFIX}`);
    envConf.GMSOFT_ENV_FILTER = `^(${envWhiteList.join('|')})`;
    // 默认开启Source Map，方便内部调试，在部署线上环境时，增加尾处理，删除相关文件即可
    envConf.REACT_APP_GENERATE_SOURCEMAP = true;

    console.log(chalk.magenta('=========================== 环境变量 ==========================='));
    console.log('envConf: ', envConf);

    // 将配置写进环境变量
    for (const k in envConf) {
      if (Object.hasOwnProperty.call(envConf, k)) {
        const v = envConf[k];
        if (Object.hasOwnProperty.call(process.env, k)) {
          console.log('发现环境变量冲突，此次打包的产出可能会出现意外的结果，请注意！');
        }
        process.env[k] = v;
      }
    }

    // =====================================================================================================
    // 编译打包
    await require('../../react-scripts/build-script');
    const paths = require(configResolve('paths'));
    const buildDir = paths.appBuild;

    // 向目标目录释放环境变量映射文件
    const filePath = path.resolve(buildDir, 'ci-meta.json');
    const projectInfo = fs.readJSONSync(path.resolve(projectRoot, 'package.json'));
    const nowDate = new Date();
    const timeStr = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${
      nowDate.getDay() + 1
    }T${nowDate.getHours()}-${nowDate.getMinutes()}-${nowDate.getSeconds()}`;
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        envMap: envConf,
        projectVersion: projectInfo.version,
        ciVersion: `${projectInfo.version}-CI-${timeStr}`,
      })
    );

    await zip(buildDir, opts.dest);

    console.log('[DONE] Make 操作成功完成!');
  } catch (error) {
    console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'fork'));
  }
}

module.exports = make;
