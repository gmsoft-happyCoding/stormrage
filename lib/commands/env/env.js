const chalk = require('chalk');
const { ErrorHelper } = require('../../utils/ErrorHelper');
const { ConfHelper } = require('../../utils/ConfHelper');
const getProjectRoot = require('../../project-info/getProjectRoot');
const projectDirAsking = require('../buildAsking/projectDirAsking');

async function getTargetEnv(localDir, opts) {
  // 如果传递了本地Make目录则使用本地Make目录，否则使用当前执行目录
  let rootDir = localDir || process.cwd();

  // 询问项目根目录位置
  const projectDirAnswers = await projectDirAsking(rootDir, opts.package);

  // 获取当前项目根目录（如果是mono项目，则会转到子项目根路径下，如果是普通单包项目，则路径同rootDir）
  const projectRoot = getProjectRoot(projectDirAnswers.projectDir, projectDirAnswers.package);

  // 切换工作目录到项目根目录
  process.chdir(projectRoot);

  // 获取基础配置信息，取得有那些机房可用，为后续配置枚举准备数据
  const baseConf = await ConfHelper.getBaseConfig();
  const rooms = opts.room ? [opts.room] : ConfHelper.getAllRoom(baseConf);

  const envResult = await ConfHelper.getFullEnvConf({
    rootDir: projectRoot,
    rooms,
    confName: opts.conf,
    envName: opts.env,
    envField: opts.field,
  });

  return envResult;
}

async function env({ localDir, opts }) {
  try {
    const { envConf: fullEnvConf, originalEnvConf } = await getTargetEnv(localDir, opts);

    console.log(chalk.magenta('=========================== 环境变量 ==========================='));
    if (opts.room) {
      console.log(originalEnvConf);
    } else {
      console.log(fullEnvConf);
    }
  } catch (error) {
    console.error('[ERROR]: %s', ErrorHelper.getErrorMessage(error.message, 'make'));
  }
}

module.exports = { env, getTargetEnv };
