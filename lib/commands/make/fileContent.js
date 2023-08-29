const path = require('path');
const fs = require('fs-extra');

const files = [
  {
    filename: 'Jenkinsfile',
    content: ['#!groovy', "@Library('buildPlugin') _", `verOpers techtype: 'front'`],
  },
];

function writeAllFile(dirPath) {
  files.forEach(file => {
    fs.writeFileSync(path.join(dirPath, file.filename), file.content.join('\n'));
  });
}

module.exports = { writeAllFile };
