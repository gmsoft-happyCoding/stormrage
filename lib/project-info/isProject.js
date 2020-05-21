const fs = require('fs-extra');
const path = require('path');

const isProject = projectDir => fs.pathExistsSync(path.resolve(projectDir, 'package.json'));

const isMonoProject = projectDir =>
  isProject(projectDir) && fs.pathExistsSync(path.resolve(projectDir, 'packages'));

const isSubProject = projectDir =>
  isProject(projectDir) && fs.pathExistsSync(path.resolve(projectDir, '..', '..', 'packages'));

const isComponentsProject = projectDir =>
  isProject(projectDir) && !!fs.readJSONSync(path.resolve(projectDir, 'package.json')).isComponents;

const isFisProject = projectDir =>
  isProject(projectDir) &&
  (fs.pathExistsSync(path.resolve(projectDir, 'fis-conf.js')) ||
    !fs.pathExistsSync(path.resolve(projectDir, 'config', 'webpack.config.dev.js')));

module.exports = {
  isProject,
  isSubProject,
  isMonoProject,
  isComponentsProject,
  isFisProject,
};
