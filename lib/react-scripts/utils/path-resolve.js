const path = require('path');

module.exports = {
  configResolve: (...paths) => path.resolve('.', 'config', ...paths),
};
