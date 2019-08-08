const immer = require('immer');

const produce = immer.default;

module.exports = (mediaName, mode, projectConfig) => ({
  inquirer: require('inquirer'),
  produce,
  mediaName,
  mode,
  config: produce(projectConfig, draft => {
    draft.ignoreFiles = (draft.ignoreFiles || []).concat(require('../default-ignore-files'));
  }),
});
