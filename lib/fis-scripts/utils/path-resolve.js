const path = require('path');

module.exports = {
  projectConfigResolve: file => path.resolve('.', 'project-conf', 'media', `${file}.js`),
  projectConfigNextResolve: file => path.resolve('.', 'project-conf', 'media', `${file}.yml`),
  projectFisConfigResolve: () => path.resolve('.', 'fis-conf.js'),
};
