const path = require("path");

module.exports = (projectDir, packageType) => {
  return packageType
    ? path.resolve(projectDir, "packages", packageType)
    : projectDir;
};
