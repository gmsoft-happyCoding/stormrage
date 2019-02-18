#!/usr/bin/env node

"use strict";

const program = require("commander");
const packageJson = require("../package.json");

program
  .version(packageJson.version, "-v, --version")
  .command("init", "根据模板生成项目 https://github.com/gmsoft-happyCoding");

program.parse(process.argv);
