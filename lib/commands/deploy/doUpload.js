const lodash = require('lodash');
const path = require('path');
const url = require('url');
const { ConfHelper } = require('../../utils/ConfHelper');
const scp = require('../../utils/scp');

async function doUpload({ targetConf, env, room, deployType, buildDir }) {
  // ================================================ 发布配置构建 ================================================
  const keyName = ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_TO;
  let deployConf = targetConf[keyName];
  if (!deployConf) {
    // 如果目标配置本身没有配置deployConf，说明使用默认配置，从默认配置去获取部署点信息
    const confUrl = await ConfHelper.getConfigUrl(
      null,
      env,
      room,
      ConfHelper.CONF_DEFAULT_DEPLOY_FILENAME
    );
    // 默认发布配置信息
    const allDeployConf = await ConfHelper.getYmlConfig(confUrl);
    deployConf =
      allDeployConf[keyName][
        deployType === 'app'
          ? ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_APP
          : ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_COMPONENT
      ];
  }
  // ================================================ 机房信息获取 ================================================
  const machineInfoUrl = ConfHelper.getConfigUrl(
    null,
    env,
    room,
    ConfHelper.CONF_DEFAULT_MACHINES_FILENAME
  );
  const allMachineInfo = await ConfHelper.getYmlConfig(machineInfoUrl);
  const machinesInfo = allMachineInfo[ConfHelper.CONF_DEFAULT_DEPLOY_FIELD_MACHINES];

  const deployMachines = deployConf.map(conf => {
    const targetMachine = machinesInfo.find(i => i.name === conf.toMachine);
    if (targetMachine) {
      const subDir = url.parse(
        ConfHelper.addProtocol(lodash.get(targetConf, 'business.public-url'))
      ).pathname;

      return {
        host: lodash.get(targetMachine, 'login.ip'),
        port: lodash.get(targetMachine, 'login.port'),
        username: lodash.get(targetMachine, 'login.user'),
        password: lodash.get(targetMachine, 'login.password'),
        privateKey: lodash.get(targetMachine, 'login.privateKey'),
        path: path.join(lodash.get(targetMachine, conf.toLocation.trim()), subDir),
      };
    }
    return null;
  });

  // ================================================ 目标文件部署 ================================================
  for (const machines of deployMachines) {
    let pwd = {};
    // 如果没有发现口令配置，写入默认的RSA免密登录文件地址，可能不存在，如果不存在，后续会询问
    if (machines.password === undefined && machines.privateKey === undefined) {
      pwd.privateKey = ConfHelper.getRsaFilePath();
      pwd.passphrase = '';
    }
    await scp(
      buildDir,
      {
        ...machines,
        ...pwd,
      },
      true
    );
  }
}

module.exports = { doUpload };
