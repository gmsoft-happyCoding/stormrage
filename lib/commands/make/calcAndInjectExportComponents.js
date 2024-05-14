const _ = require('lodash');
const { configResolve } = require('../../react-scripts/utils/path-resolve');
const { checkVersion } = require('./checkVersion');

/* 
    {
      includeComponents: ["a", "b"];
      excludeComponents: ["c", "d"];
      version: ["1.0.*", "1.5.1", ">1.5.3"];
    }
    */
// 1.解析当前发布的组件入口：require(configResolve('exportComponents'))
// 2.根据规则过滤
// 3.注入到环境变量：global.PICK_EXPORT_COMPONENTS
function calcAndInjectExportComponents(makeOpt, projectMeta) {
  // 检查配置是否合法
  const checkResult = checkOpt(makeOpt);
  if (!checkResult.isPass) {
    console.warn(
      '[WARN] 组件条件发布选项检查未通过: %s，将全量发布所有组件。请对照文档说明进行修改（http://192.168.2.11:12266）。',
      checkResult.msg
    );
    return;
  }

  // 读取所有组件入口映射配置
  const exportComponents = require(configResolve('exportComponents'));
  const allComponentName = Object.keys(exportComponents);
  const currentMainVersion = projectMeta.version.match(/^(\d+\.\d+\.\d+)/)[1];

  // 检查版本是否符合规则
  if (!checkVersion(currentMainVersion, makeOpt.version)) {
    console.log(
      '[INFO] 当前版本 %s 不符合规则 %s，将全量发布所有组件。',
      currentMainVersion,
      makeOpt.version
    );
    return;
  }

  let tempExportComponents = {};
  // 应用白名单
  if (makeOpt.includeComponents && makeOpt.includeComponents.length > 0) {
    const includeComponents = makeOpt.includeComponents;
    const includeComponentsSet = new Set(includeComponents);
    const includeComponentName = allComponentName.filter(name => includeComponentsSet.has(name));
    tempExportComponents = _.pick(exportComponents, includeComponentName);
  } else {
    tempExportComponents = exportComponents;
  }

  // 应用黑名单
  if (makeOpt.excludeComponents && makeOpt.excludeComponents.length > 0) {
    const excludeComponents = makeOpt.excludeComponents;
    tempExportComponents = _.omit(tempExportComponents, excludeComponents);
  }

  console.log(
    '[INFO] 当前版本 %s 符合条件发布规则，将按照规则发布组件：%s',
    currentMainVersion,
    Object.keys(tempExportComponents).join(', ')
  );

  // 写入环境变量
  global.PICK_EXPORT_COMPONENTS = tempExportComponents;
}

function checkOpt(opt) {
  if (
    (!opt.includeComponents && !opt.excludeComponents) ||
    (_.get(opt, 'includeComponents.length') === 0 && _.get(opt, 'excludeComponents.length') === 0)
  ) {
    return {
      isPass: false,
      msg: 'includeComponents 和 excludeComponents 不能同时为空',
    };
  }

  if (!opt.version || _.get(opt, 'version.length') === 0) {
    return {
      isPass: false,
      msg: 'version 不能为空',
    };
  }

  const versionPattern = /^(<|>)?=?(\d+|\*)(\.(\d+|\*)){2}$/;
  for (let v of opt.version) {
    if (!versionPattern.test(v)) {
      return {
        isPass: false,
        msg: `version 格式不正确: ${v}`,
      };
    }
    if (v.includes('*') && v.match(/(<|>|<=|>=)/)) {
      return {
        isPass: false,
        msg: `version 格式不正确: ${v}，通配符版本号不能和比较符一起使用`,
      };
    }
  }

  return {
    isPass: true,
  };
}

module.exports = { calcAndInjectExportComponents };
