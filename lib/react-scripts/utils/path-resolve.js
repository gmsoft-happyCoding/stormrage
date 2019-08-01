const path = require("path");

module.exports = {
  configResolve: (...paths) => path.resolve(".", "config", ...paths),
  nodeModuleResolve: (...paths) =>
    path.resolve(__dirname, "..", "..", "..", "node_modules", ...paths)
};
