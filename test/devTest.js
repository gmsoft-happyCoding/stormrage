const os = require('os');
const path = require('path');
const { ConfHelper } = require('../lib/utils/ConfHelper');
const { SvnHelper } = require('../lib/utils/SvnHelper');

async function main() {
  const tempDir = path.resolve(os.tmpdir(), ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR);

  const zoperatorDir = path.resolve(tempDir, ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR);
  // 取得当前项目的远端根路径
  const projectRemoteRootDir = await SvnHelper.getRootDirFromLocal(
    'D:\\Dev\\政府采购网门户\\branches\\cli-test\\gpwmain'
  );

  // 判断远程目录是否存在，如果存在则拉取到本地
  const zOperateDir = `${projectRemoteRootDir}/${ConfHelper.CONF_CI_OPERATOR_DETECTED_DIR}`;

  await SvnHelper.checkout(zOperateDir, tempDir);
}

main();
