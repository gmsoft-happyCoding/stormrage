const fs = require('fs');
const path = require('path');

module.exports = () =>
  fs
    .readdirSync(path.resolve('.', 'project-conf', 'media'))
    .filter(fileName => /.*-.*/.test(fileName))
    .map(fileName => path.parse(fileName).name.split('-')[1]);
