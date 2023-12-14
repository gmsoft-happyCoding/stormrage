const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { envMapFileName } = require('./create-env-tpl');
const { FileHelper } = require('../../utils/FileHelper');
const { uniq } = require('lodash');
const { default: chalk } = require('chalk');
const { RegExpUtils } = require('../../utils/RegexUtils');

// 正则表达式需要转义的元字符匹配模式
const regexCharsRegex = new RegExp(
  ['([', '$', '^', '{', '}', '(', ')', '[', ']', '|', '.', '+', '?', '\\'].join('\\') + '])',
  'g'
);
// 默认忽略的文件夹
const defaultIgnoreDir = ['node_modules', 'modules', 'dist', 'build'];

async function replaceEnv({ localDir, opts }) {
  const rootDir = localDir || process.cwd();
  const confFilePath = path.join(rootDir, envMapFileName);

  if (!fs.existsSync(confFilePath)) {
    console.log(`[Error] 当前目录未找到映射文件 ${envMapFileName}，请先创建映射配置文件`);
    return;
  }

  const replaceConf = require(path.join(rootDir, envMapFileName));
  const mapKeys = Object.keys(replaceConf.envMap).map(i => i.replace(regexCharsRegex, '\\$1'));

  console.log(chalk.green('\n替换映射表：'));
  console.log(replaceConf.envMap);
  console.log(chalk.green('处理的目标文件：'));
  console.log(replaceConf.fileExt);
  console.log(chalk.green('排除的目标文件：'));
  console.log(replaceConf.exclude, '\n');

  // 要替换的目标串模式，基于配置的动态正则表达式
  const fisRegexpStr = `\\$\\{(?!(business|gateway|hosts|pdf-preview)\\.)(${mapKeys.join('|')})\\}`;
  const reactRegexpStr = `(process\\.env\\.|env\\.raw\\.)(${mapKeys.join('|')})`;
  // ReactHTML模板环境变量单独的匹配规则
  const reactHTMLRegexStr = `%(${mapKeys.join('|')})%`;

  const isFisProject = fs.existsSync(path.join(rootDir, 'fis-conf.js'));
  const regexpStr = isFisProject ? fisRegexpStr : reactRegexpStr;
  const matchPattern = new RegExp(regexpStr, 'g');
  const reactHTMLRegex = new RegExp(reactHTMLRegexStr, 'g');

  const allFile = FileHelper.getAllFile(
    rootDir,
    replaceConf.fileExt ? replaceConf.fileExt.split(',') : undefined,
    replaceConf.exclude ? replaceConf.exclude.split(',') : defaultIgnoreDir
  );

  const vsCodeDebug = false;
  let result = 'no';
  if (!vsCodeDebug) {
    // 询问是否开始替换
    result = await inquirer.prompt([
      {
        type: 'list',
        name: 'goon',
        message: '是否开始替换？（请确认本地没有未提交的修改，避免代码出现损坏后无法回退）',
        choices: ['yes', 'no'],
      },
    ]);
  }

  if (vsCodeDebug || result.goon === 'yes') {
    allFile.forEach(filePath => {
      const isHtmlFile = filePath.endsWith('.html');
      let fileContent = FileHelper.readFileContent(filePath);
      const matched = fileContent.match(matchPattern);
      const htmlMatched = isHtmlFile && fileContent.match(reactHTMLRegex);
      if (matched || htmlMatched) {
        if (matched) {
          // 将命中的规则去重
          const uniqMatch = uniq(matched);
          // Key值的匹配模式
          const keyPattern = isFisProject ? /(\$)\{(.*)\}/ : /(process\.env\.|env\.raw\.)(\w+)/;
          // 提取出结果中的key
          const keys = uniqMatch.map(i => i.match(keyPattern)[2]);
          // 遍历keys，并从map中取得对应的值，然后在content中进行替换
          keys.forEach(key => {
            const value = replaceConf.envMap[key];
            if (value) {
              fileContent = isFisProject
                ? fileContent.replace(new RegExp(RegExpUtils.escape(`\${${key}}`)), `\${${value}}`)
                : fileContent
                    .replace(
                      new RegExp(RegExpUtils.escape(`process.env.${key}`)),
                      `process.env['${value}']`
                    )
                    .replace(
                      new RegExp(RegExpUtils.escape(`env.raw.${key}`)),
                      `env.raw['${value}']`
                    );
            }
          });
        }

        if (htmlMatched) {
          const uniqHTMLMatch = uniq(htmlMatched);
          const htmlKeys = uniqHTMLMatch.map(i => i.match(/%(\w+)%/)[1]);
          htmlKeys.forEach(htmlKey => {
            const value = replaceConf.envMap[htmlKey];
            if (value) {
              fileContent = fileContent.replace(
                new RegExp(RegExpUtils.escape(`%${htmlKey}%`)),
                `%${value}%`
              );
            }
          });
        }
        FileHelper.writeFileContent(filePath, fileContent);
      }
    });
    console.log('[Done] 环境变量替换完成，请检查项目是否正常运行');
  } else {
    console.log('[Done] 放弃替换');
  }
}

module.exports = { replaceEnv };
