const fs = require('fs');
const path = require('path');
const { configResolve } = require('./path-resolve');

module.exports = () => {
  const paths = require(configResolve('paths'));

  return fs
    .readdirSync(paths.projectConfig)
    .filter(fileName => /.*-.*/.test(fileName))
    .map(fileName => path.parse(fileName).name.split('-')[1]);
};
