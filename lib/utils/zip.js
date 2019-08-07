// require modules
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const archiver = require('archiver');
const { isSubProject, isComponentsProject } = require('../projectInfo/isProject');
const { packageType } = require('../projectInfo/packageType');

/**
 * 在当前项目根目录生产打包文件
 * @param {string} source - 源
 * @param {string} dest - 保存文件路径
 */
function zip(source, dest) {
  const projectRoot = process.cwd();

  let suffix = null;
  if (isSubProject(projectRoot)) {
    suffix = isComponentsProject(projectRoot) ? packageType.COMPONENTS : packageType.APP;
  }
  const projectName = path.basename(
    isSubProject(projectRoot) ? path.join(projectRoot, '..', '..') : projectRoot
  );
  const fileName = suffix ? `${projectName}-${suffix}` : `${projectName}`;
  fs.ensureDirSync(dest);
  const outputFile = path.format({ dir: dest, name: fileName, ext: '.zip' });

  // create a file to stream archive data to.
  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
  });

  const p = new Promise((resolve, reject) => {
    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      console.log(
        chalk.yellow(`${outputFile} 文件生成完毕(${Math.ceil(archive.pointer() / 1024)}Kb)!`)
      );
      resolve(path.format({ name: fileName, ext: '.zip' }));
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      console.log('zip warning', err);
      reject(err);
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      console.log('zip error', err);
      reject(err);
    });
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append files from a sub-directory, putting its contents at the root of archive
  archive.directory(source, false);

  // finalize the archive (ie we are done appending files but streams have to finish yet)
  // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
  archive.finalize();

  return p;
}

module.exports = zip;
