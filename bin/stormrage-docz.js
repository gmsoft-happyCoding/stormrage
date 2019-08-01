#!/usr/bin/env node --max_old_space_size=6144

const path = require("path");
const program = require("commander");
const docz = require("../lib/commands/docz");

program
  .option("-p, --package <package>", "项目为mono仓库时, 指定启动的package")
  .parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

docz({ projectDir, package: program.package });
