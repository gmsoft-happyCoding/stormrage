const immer = require('immer');

const produce = immer.default;

module.exports = (mediaName, mode, projectConfig = {}, pluginOption = {}) => ({
  inquirer: require('inquirer'),
  produce,
  mediaName,
  mode,
  pluginOption,
  config: produce(projectConfig, draft => {
    draft.ignoreFiles = (draft.ignoreFiles || []).concat(require('../default-ignore-files'));
  }),
});
