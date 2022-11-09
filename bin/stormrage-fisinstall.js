#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const process = require('process');
const fisinstall = require('../lib/commands/fisinstall');

program.option('-r, --root <project>', '指定项目根目录').parse(process.argv);

const components = program.args[0];

fisinstall({ projectDir: program.root || process.cwd(), components });
