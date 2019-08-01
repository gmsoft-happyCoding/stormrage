const fs = require('fs-extra');
const path = require('path');

const isProject = projectDir => fs.pathExistsSync(path.resolve(projectDir, 'package.json'));

const isMonoProject = projectDir =>
  isProject(projectDir) && fs.pathExistsSync(path.resolve(projectDir, 'packages'));

const isSubProject = projectDir =>
  isProject(projectDir) && fs.pathExistsSync(path.resolve(projectDir, '..', '..', 'packages'));

const isComponentsProject = projectDir =>
  isProject(projectDir) && !!fs.readJSONSync(path.resolve(projectDir, 'package.json')).isComponents;

module.exports = {
  isProject,
  isSubProject,
  isMonoProject,
  isComponentsProject,
};
