#!/usr/bin/env node

"use strict";

const program = require("commander");
const init = require("../lib/commands/init");

program.option("-s, --no-start", "生成后不自动启动项目").parse(process.argv);

init(program.start);
