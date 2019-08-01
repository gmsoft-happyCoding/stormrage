#!/usr/bin/env node --max_old_space_size=6144

const path = require("path");
const program = require("commander");
const test = require("../lib/commands/test");

program
  .option("-p, --package <package>", "项目为mono仓库时, 指定测试的package")
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

test({ projectDir, package: program.package });
