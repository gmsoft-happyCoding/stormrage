const Hosts = require("hosts-so-easy").default;
const chalk = require("chalk");
const path = require("path");
const os = require("os");

// 更新hosts文件, cdn server 使用的是内部域名
async function updateHosts() {
  console.log(chalk.magenta("开始更新hosts文件..."));
  const hostMap = {
    "192.168.2.11": "cdn.gmsoftdev.com"
  };
  console.log(JSON.stringify(hostMap, null, 2));

  // hosts-so-easy 有平台判断bug, 暂时还没有修复, 手动设置hostsFile
  const hostsFile =
    os.platform() === "win32"
      ? path.normalize("C:/Windows/System32/drivers/etc/hosts")
      : path.normalize("/etc/hosts");

  try {
    const hosts = new Hosts({
      hostsFile,
      EOL: os.EOL
    });
    for (const host in hostMap) hosts.add(host, hostMap[host]);
    await hosts.updateFinish();
    console.log(chalk.magenta("更新hosts文件完成"));
  } catch (e) {
    console.error(e);
  }
}

module.exports = updateHosts;
