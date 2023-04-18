const moment = require('moment');
const lodash = require('lodash');
const { NpmHelper } = require('../../utils/NpmHelper');
const { ConfHelper } = require('../../utils/ConfHelper');
const { ReleaseHelper } = require('../../utils/ReleaseHelper');

async function getMakeMate({ originalEnvConf, projectInfo, baseConf }) {
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

  return { projectName, timeStr, makeVersion, npmHelper, makeVersion };
}

module.exports = { getMakeMate };
