const path = require('path');
const fs = require('fs-extra');
const { ConfHelper } = require('../../utils/ConfHelper');
const { SvnHelper } = require('../../utils/SvnHelper');
const { writeAllFile } = require('./fileContent');

async function createZOperator(baseConf, rootDir) {
  // ================================================= 处理CI相关文件 =================================================
  const tempDir = path.resolve(rootDir, ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR);
  try {
    const zoperatorDir = path.resolve(tempDir, ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR);
    // 取得当前项目的远端根路径
    const projectRemoteRootDir = await SvnHelper.getRootDirFromLocal(rootDir);

    // 判断远程目录是否存在，如果存在则跳过当前逻辑
    const zOperateDir = `${projectRemoteRootDir}/${ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR}`;
    if (await SvnHelper.dirIsExists(zOperateDir)) {
      return;
    }

    // 获取CI所需的环境、机房相关信息
    const allEnvs = await ConfHelper.getAllEnvs();
    const allRooms = await ConfHelper.getAllRooms(baseConf);
    const allRoomsCommons = await ConfHelper.getAllRoomsCommons(baseConf);
    // 写出相关文件，并导入SVN
    const envFilePath = path.resolve(zoperatorDir, 'envnames');
    const dyFilePath = path.resolve(zoperatorDir, 'dyvalues');
    const dycommsFilePath = path.resolve(zoperatorDir, 'dycomms');
    fs.mkdirSync(zoperatorDir, { recursive: true });
    // 写出CI所需的环境备选项文件
    fs.writeFileSync(envFilePath, allEnvs.join('\n'));
    fs.writeFileSync(dyFilePath, allRooms.join('\n'));
    fs.writeFileSync(dycommsFilePath, allRoomsCommons);
    writeAllFile(zoperatorDir);
    await SvnHelper.import(tempDir, projectRemoteRootDir);
    fs.removeSync(tempDir);
  } catch (error) {
    // 删除临时文件夹
    fs.removeSync(tempDir);
    // 静默失败
  }
}

module.exports = createZOperator;
