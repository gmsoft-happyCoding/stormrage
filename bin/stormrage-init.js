#!/usr/bin/env node --max_old_space_size=6144

"use strict";

const program = require("commander");
const init = require("../lib/commands/init");

program.option("-s, --no-start", "生成后不自动启动项目").parse(process.argv);

init(program.start);
