const chalk = require('chalk');

class LogHelper {
  static printSegment(title) {
    console.log(chalk.magenta(`---------------------------${title}---------------------------`));
  }
}

module.exports = { LogHelper };
