const path = require('path');

module.exports = {
  projectConfigResolve: file => path.resolve('.', 'project-conf', 'media', `${file}.js`),
  projectFisConfigResolve: () => path.resolve('.', 'fis-conf.js'),
};
