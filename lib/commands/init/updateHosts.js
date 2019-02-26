const hostile = require("hostile");
const chalk = require("chalk");
const path = require("path");

const preserveFormatting = false;
let existedRules = null;

// ip 相同的多条规则合并为一条
function mergeRules(rules) {
  return rules.reduce((merged, [ip, hosts]) => {
    const mergedHosts = merged.get(ip);
    merged.set(ip, mergedHosts ? mergedHosts.concat(` ${hosts}`) : hosts);
    return merged;
  }, new Map());
}

// 判断规则是否已经存在
function needSet(ip, host) {
  if (!existedRules)
    existedRules = mergeRules(hostile.get(preserveFormatting)) || new Map();
  const hosts = existedRules.get(ip);
  return !(hosts && hosts.includes(host));
}

// 更新hosts文件
function updateHosts() {
  console.log(chalk.magenta("开始更新hosts文件..."));
  const rules = [
    ["192.168.2.11", "cdn.gmsoftdev.com"],
    ["192.168.2.11", "registry.gmsoftdev.com"],
    ["192.168.2.12", "registry.gmsofttest.com"]
  ];
  console.log(JSON.stringify(rules, null, 2));

  try {
    for (const [ip, host] of rules) {
      if (needSet(ip, host)) hostile.set(ip, host);
    }
    console.log(chalk.magenta("更新hosts文件完成"));
  } catch (e) {
    console.log(chalk.yellow(e));
  }
}

module.exports = updateHosts;
