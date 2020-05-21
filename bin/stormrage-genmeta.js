#!/usr/bin/env node --max_old_space_size=6144

const path = require('path');
const program = require('commander');
const pluginOptionProcess = require('./utils/pluginOptionProcess');
const genmeta = require('../lib/commands/genmeta');

program.option('--pick', '选择需要提取元数据的组件').parse(process.argv);

const projectDir = program.args[0]
  ? path.resolve(process.cwd(), path.normalize(program.args[0]))
  : process.cwd();

genmeta({
  projectDir,
  pick: program.pick,
});
