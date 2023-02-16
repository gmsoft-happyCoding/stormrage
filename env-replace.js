module.exports = {
  // 需要替换的环境变量，映射关系为：{ '需要替换的变量名': '替换后的变量名' }
  envMap: {
    // 例：'process.env.REACT_APP_YW_GATEWAY': 'process.env.gateway.yw',
    // 请在此处添加项目替换映射配置
  },

  // 需要替换的文件后缀，多个后缀使用逗号进行分隔（不要带点），例：js,css
  fileExt: 'js,jsx,ts,tsx,json,html,css,less,scss,sass,tpl,es,html',
  // 不需要替换的文件夹或文件名称；多个配置使用逗号进行分隔，例：node_modules,modules,package.json
  exclude: 'node_modules,modules,env-replace.js',
};