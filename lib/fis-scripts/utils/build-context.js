const immer = require('immer');

const produce = immer.default;

module.exports = (mediaName, mode, projectConfig) => ({
  inquirer: require('inquirer'),
  mediaName,
  mode,
  config: produce(projectConfig, draft => {
    draft.ignoreFiles = (draft.ignoreFiles || []).concat(require('../default-ignore-files'));
  }),
});
