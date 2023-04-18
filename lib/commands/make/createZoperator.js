const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { ConfHelper } = require('../../utils/ConfHelper');
const { SvnHelper } = require('../../utils/SvnHelper');
const { writeAllFile } = require('./fileContent');
const { FileHelper } = require('../../utils/FileHelper');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');

async function createZOperator(baseConf, rootDir, metaInfo) {
  console.log('metaInfo: ', metaInfo);
  // ================================================= 处理CI相关文件 =================================================
  const tempDir = os.tmpdir();
  const localZoperatorDir = path.resolve(tempDir, ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR);
  fs.removeSync(localZoperatorDir);
  try {
    // 取得当前项目的远端根路径
    const projectRemoteRootDir = await SvnHelper.getRootDirFromLocal(rootDir);

    // 判断远程目录是否存在，如果存在则拉取到本地
    const remoteZOperateDir = `${projectRemoteRootDir}/${ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR}`;
    const isExist = await SvnHelper.dirIsExist(remoteZOperateDir);

    const envFilePath = path.resolve(localZoperatorDir, 'envnames');
    const dyFilePath = path.resolve(localZoperatorDir, 'dyvalues');
    const dycommsFilePath = path.resolve(localZoperatorDir, 'dycomms');
    const runmodelsFilePath = path.resolve(localZoperatorDir, 'runmodels');

    // 获取CI所需的环境、机房相关信息
    const allEnvs = await ConfHelper.getAllEnvs();
    const allRooms = await ConfHelper.getAllRooms(baseConf);
    const allRoomsCommons = await ConfHelper.getAllRoomsCommons(baseConf);

    // 创建暂存文件夹
    fs.mkdirSync(localZoperatorDir, { recursive: true });

    // 如果远程文件夹存在，则进行迁出
    if (isExist) {
      await SvnHelper.checkout(remoteZOperateDir, localZoperatorDir);
    }

    // 写出CI所需的环境备选项文件
    fs.writeFileSync(envFilePath, allEnvs.join('\n'));
    fs.writeFileSync(dyFilePath, allRooms.join('\n'));
    fs.writeFileSync(dycommsFilePath, allRoomsCommons);
    // 写出静态文件，文件内容无变化的，请托管到此处集中写出
    writeAllFile(localZoperatorDir);

    let runmodelsFileContent = '';
    const runmoduleIsExist = FileHelper.isFile(runmodelsFilePath);
    if (runmoduleIsExist) {
      // 存在文件，说明是经过Checkout迁出的，尝试进行更新
      runmodelsFileContent = FileHelper.readFileContent(runmodelsFilePath);
      if (!runmodelsFileContent.includes(metaInfo.projectName)) {
        /**
         * 不包含当前项目的名字，需要进行添加，否则不做任何操作，下面操作的详细说明：
         * 1. 如果文件存在一行，那么说明当前添加的是第二个项目，需要在第一行写入约定的特殊标记：all，并将当前项目名追加到末尾，原来的第一行记录的项目名称变为第二行
         * 形成如下结构：
         * all
         * projectA
         * projectB
         * 2. 如果文件存在多行，那么说明当前添加的是第三个或更多的子项目，将当前项目追加到首行末尾，并将当前项目名追加到末尾行即可
         */
        const fileLine = runmodelsFileContent.split('\n');

        if (fileLine.length === 1) {
          fileLine.unshift('all');
        }

        fileLine.push(metaInfo.projectName);
        runmodelsFileContent = fileLine.join('\n');
      }
    } else {
      // 不存在文件，直接写出项目名即可
      runmodelsFileContent = metaInfo.projectName;
    }

    fs.writeFileSync(runmodelsFilePath, runmodelsFileContent);

    if (!isExist) {
      // 如果远程目录不存在，执行import操作
      await SvnHelper.import(localZoperatorDir, remoteZOperateDir);
    } else {
      // 远程目录存在，执行commit操作
      await SvnHelper.commit('chore：更新zOperator文件', localZoperatorDir);
    }
    // 清理暂存文件夹
    fs.removeSync(localZoperatorDir);
  } catch (error) {
    // 删除临时文件夹
    fs.removeSync(localZoperatorDir);
    ErrorHelper.throwError(ErrorCode.ERROR_MAKE_INIT_ZOPERATOR_FAILED, error.message);
  }
}

module.exports = createZOperator;
