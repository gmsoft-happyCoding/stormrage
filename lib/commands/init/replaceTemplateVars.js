const fs = require("fs");
const chalk = require("chalk");
const walker = require("fs-walker");
const projectRoot = require("./projectRoot");
const replaceVars = require("../../utils/replaceVars");

// 替换模板中的变量
function replaceTemplateVars(projectDir, vars) {
  console.log(chalk.magenta("开始替换模板变量..."));
  console.log(JSON.stringify(vars, null, 2));
  var filter = {
    file: function(stats) {
      return !/(node_modules|\.(ico|png|jpg|lock)$)/i.test(stats.fullname);
    }
  };
  walker.files.sync(projectRoot(projectDir), filter).forEach(function(stats) {
    const fileContent = fs.readFileSync(stats.fullname, {
      encoding: "utf8"
    });
    fs.writeFileSync(stats.fullname, replaceVars(fileContent, vars));
  });
  console.log(chalk.magenta("替换模板变量完成"));
}

module.exports = replaceTemplateVars;
