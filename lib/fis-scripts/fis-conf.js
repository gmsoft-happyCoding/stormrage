const fs = require('fs-extra');

const context = JSON.parse(process.env.__context);
console.log('context', context);

// 加载基础fis配置
require('./fis-base-conf')(context);

// 应用项目配置
require('./useConf')(context);

// 加载项目额外的fis配置
const { projectFisConfigResolve } = require('./utils/path-resolve');
const projectFisConfigPath = projectFisConfigResolve();
if (fs.pathExistsSync(projectFisConfigPath)) require(projectFisConfigPath);
