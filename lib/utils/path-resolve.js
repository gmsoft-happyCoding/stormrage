const path = require('path');

module.exports = {
  nodeModuleResolve: (...paths) => path.resolve(__dirname, '..', '..', 'node_modules', ...paths),
};
