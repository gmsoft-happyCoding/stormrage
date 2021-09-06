module.exports = {
  // 解析 plugin-option 失败, 请检查校验是否是合法的json字符串
  PLUGIN_OPTION_ERROR: 1,
  // 拷贝配置文件到发布目录失败
  COPY_MACHINE_CONF_ERROR: 2,
  // 环境对应项目配置文件不存在
  NO_CONF_ERROR: 3,
  // 项目配置文件错误
  CONF_ERROR: 4,
  // 写应用部署信息文件失败
  WRITE_APP_CONF_ERROR: 5,
  // SVN相关操作失败
  SVN_ERROR: 6,
  // REACT_APP_DEPLOY_MACHINES 配置解析失败
  REACT_APP_DEPLOY_MACHINES_ERROR: 7,
  // build错误
  BUILD_ERROR: 8,
  // yarn未安装
  NO_YARN_ERROR: 9,
  // 生成或者解压zip文件错误
  ZIP_ERROR: 10,
  // 执行(第三方)命令失败
  RUN_COMMAND_ERROR: 11,
  // 依赖安装错误
  YARN_INSTALL_ERROR: 12,

  // 初始化模板下载失败
  DOWNLOAD_ERROR: 100,
  // 未知错误
  UNKNOWN_ERROR: 10000,
};
