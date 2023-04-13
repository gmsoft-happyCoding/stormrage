const { FileHelper } = require('../../utils/FileHelper');

/**
 * 递归重算文件Hash名称并进行文件重命名
 * @param {*} allFiles 当前轮次所有文件列表（最新的，文件列表会受到重命名东西影响，会出现变动）
 * @param {*} modifyFiles 当前轮次需要重命名的文件列表
 * @param {*} depth 递归深度
 * @returns
 */
async function recalculateHash(allFiles, modifyFiles, depth = 0) {
  const currentAllFile = cloneDeep(allFiles);
  const currentModifyFiles = Array.from(modifyFiles);

  if (isEmpty(currentModifyFiles)) {
    return;
  }

  if (depth >= 10) {
    ErrorHelper.throwError(ErrorCode.ERROR_RECALCULATE_HASH_DEPTH_OVERFLOW);
  }

  const nextModifyFiles = new Set();

  for (const modifyFilePath of currentModifyFiles) {
    // 计算出文件的新Hash路径
    const fileNewMD5 = FileHelper.calculateFileMD5(modifyFilePath);

    const newHashFilePath = modifyFilePath.replace(
      FileHelper.isHashFileNamePattern,
      fileNewMD5.substr(-8)
    );

    // 遍历文件列表，寻找所有包含此文件引用的文件，更新他们的引用路径
    for (const testFilePath of currentAllFile) {
      // 当前文件，自引用，跳过
      if (modifyFilePath === testFilePath) {
        continue;
      }

      // 待确认文件内容
      let fileContent = await fs.readFile(testFilePath, 'utf8');
      // 造成文件影响的原始文件名
      const effectFileName = path.basename(modifyFilePath);

      // 如果目标文件存在文件名，则更新，并记录此次文件更新，用于下一轮迭代
      if (fileContent.includes(effectFileName)) {
        fileContent = fileContent.replaceAll(effectFileName, path.basename(newHashFilePath));
        await fs.writeFile(testFilePath, fileContent, 'utf8');
        // 如果修改的文件名符合Hash重算规则，且不是sourceMap文件，则加入下一轮Hash重算任务
        if (FileHelper.isHashFileNamePattern.test(testFilePath) && !testFilePath.endsWith('.map')) {
          nextModifyFiles.add(testFilePath);
        }
      }

      // 针对Webpack模块加载系统的Hash更新逻辑
      // 匹配样例：2:"b0d52471"
      // 匹配模式：/(?<=\d:")[\da-f]{6,}(?=")/i
      const hashPattern = /(?<=\d\.)([\da-f]{6,})(?=\.chunk.js)/i;
      const oldFileHash = path.basename(effectFileName).match(hashPattern);
      const newFileHash = path.basename(newHashFilePath).match(hashPattern);
      const webpackHashPattern = new RegExp(`(?<=\\d:")${oldFileHash}(?=")`, 'ig');
      // 如果目标文件存在Webpack模块加载系统的Hash，则更新，并记录此次文件更新，用于下一轮迭代
      if (
        oldFileHash &&
        newFileHash &&
        webpackHashPattern.test(fileContent) &&
        fileContent.includes(oldFileHash[0])
      ) {
        // 替换文件Hash
        fileContent = fileContent.replace(webpackHashPattern, newFileHash[0]);
        await fs.writeFile(testFilePath, fileContent, 'utf8');
        // 如果修改的文件名符合Hash重算规则，且不是sourceMap文件，则加入下一轮Hash重算任务
        if (FileHelper.isHashFileNamePattern.test(testFilePath) && !testFilePath.endsWith('.map')) {
          nextModifyFiles.add(testFilePath);
        }
      }
    }

    if (modifyFilePath !== newHashFilePath) {
      // 更新全局文件表中对应的条目，用于后续任务迭代（执行过程中有可能会重命名表中的数据，需要实时更新）
      const targetIndex = currentAllFile.findIndex(i => i === modifyFilePath);
      currentAllFile[targetIndex] = newHashFilePath;
      // 更新任务表中对应的条目，用于后续任务迭代（执行过程中有可能会重命名表中的数据，需要实时更新）
      const targetModifyIndex = currentModifyFiles.findIndex(i => i === modifyFilePath);
      currentModifyFiles[targetModifyIndex] = newHashFilePath;
      // 下一轮任务中的文件名也要同步更新
      if (nextModifyFiles.has(modifyFilePath)) {
        nextModifyFiles.delete(modifyFilePath);
        nextModifyFiles.add(newHashFilePath);
      }

      // 造成影响的文件重命名，指定新的Hash
      await fs.rename(modifyFilePath, newHashFilePath);
    }
  }

  return await recalculateHash(currentAllFile, nextModifyFiles, depth + 1);
}

module.exports = { recalculateHash };
