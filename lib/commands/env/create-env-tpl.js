const path = require('path');
const fs = require('fs');

const envMapFileName = 'env-replace.js';

const defaultFileSuffix = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'json',
  'html',
  'css',
  'less',
  'scss',
  'sass',
  'tpl',
  'es',
  'html',
];
const defaultExclude = ['node_modules', /* 'modules', */ 'env-replace.js'];

async function createEnvTpl() {
  const cwdDir = process.cwd();
  const filePath = path.join(cwdDir, envMapFileName);
  const fileContent = `module.exports = {
  // 需要替换的环境变量，映射关系为：{ '需要替换的变量名': '替换后的变量名' }
  envMap: {
    // React样例：
    // REACT_APP_YW_GATEWAY: 'gateway.yw',
    // Fis样例：
    // interface_djc: 'gateway.djc',
    // 请在此处添加项目替换映射配置
    
  },

  // 需要替换的文件后缀，多个后缀使用逗号进行分隔（不要带点），例：js,css
  fileExt: '${defaultFileSuffix.join(',')}',
  // 不需要替换的文件夹或文件名称；多个配置使用逗号进行分隔，例：node_modules,modules,package.json
  exclude: '${defaultExclude.join(',')}',
};`;
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log(`[Done] 映射文件 ${envMapFileName} 创建成功`);
}

module.exports = { createEnvTpl, envMapFileName };
