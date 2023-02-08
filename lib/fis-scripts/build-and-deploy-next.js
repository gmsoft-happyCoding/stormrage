const yarnInstall = require('../utils/yarn-install');
// 如果没有安装依赖, 先安装依赖
yarnInstall();

const fs = require('fs-extra');
const path = require('path');
const buildContext = require('./utils/build-context');
const { apply } = require('../utils/plugin');
const errorCode = require('../errorCode');
const { ConfHelper } = require('../utils/ConfHelper');

async function run(fullEnv, buildDir) {
  try {
    const packConf = require(path.resolve('.', 'project-conf', 'pack-conf.js'));

    const context = buildContext(undefined, 'production', {
      packConf,
      vars: fullEnv,
      ignoreFiles: ['package.json'],
      notUseHash: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notUseHash`],
      notOptimizeJs: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notOptimizeJs`],
      notOptimizeCss: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.notOptimizeCss`],
      pack: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.pack`] ?? true,
      deploy: {
        type: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.deployType`] ?? 'zip',
        subPath: fullEnv[`${ConfHelper.CONF_DEFAULT_COMPILE_NAME}.deploySubPath`] ?? '',
      },
      domain: fullEnv[`${ConfHelper.CONF_DEFAULT_FIELD_NAME}.domain`],
    });

    const { inquirer, produce, pluginOption: _pluginOption, ...finalContext } = await apply(
      context
    );

    fs.emptyDirSync(buildDir);

    await require('./build-next')({
      buildDir,
      context: finalContext,
    });
  } catch (e) {
    e && console.error(e);
    process.exit(errorCode.BUILD_ERROR);
  }
}

module.exports = run;
