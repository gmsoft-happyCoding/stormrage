const immer = require('immer');

const produce = immer.default;

module.exports = (config, pluginOption = {}) => ({
  inquirer: require('inquirer'),
  produce,
  pluginOption,
  config,
});
