const { isEmpty } = require('lodash');
const fse = require('fs-extra');
const path = require('path');
const { FileHelper, FileTreeNode } = require('../../../lib/utils/FileHelper');
const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');

function buildFileTree(allTreeNode, nextFileTask) {
  // 构建文件树，最差时间复杂度为 O(n^2)
  allTreeNode.forEach(outCursor => {
    nextFileTask.forEach(innerCursor => {
      // 内游标文件名都需要符合Hash规则才进行构建，否则直接跳过
      // 如果内层游标的文件名包含在外层游标的文件内容中，则认为外层游标文件依赖内层游标文件，建立双向引用，方便后续遍历树
      const isValidFile = FileHelper.isHashFileNamePattern.test(innerCursor.fileItem.baseName);
      const hasDependencyRelation = outCursor.fileItem.fileContent.includes(
        innerCursor.fileItem.baseName
      );

      if (isValidFile && hasDependencyRelation) {
        if (outCursor.fileItem.filePath === innerCursor.fileItem.filePath) {
          // 自引用，直接跳过
          return;
        }
        // 认定为外层游标文件依赖内层游标文件
        outCursor.dependencyMap.set(innerCursor.id, innerCursor);
        innerCursor.byDependencyMap.set(outCursor.id, outCursor);
      }
    });
  });
}

function execReCalculationHash(taskFileNode, depth = 0) {
  if (isEmpty(taskFileNode)) {
    return;
  }

  if (depth > 9) {
    // 最大执行深度：10，超出后抛出异常
    ErrorHelper.throwError(ErrorCode.ERROR_RECALCULATE_HASH_DEPTH_OVERFLOW, 'tree mode');
  }

  const nextTask = [];

  taskFileNode.forEach(task => {
    const dependencyIterator = task.byDependencyMap.entries();

    for (const dependencyItem of dependencyIterator) {
      const dependencyItemFile = dependencyItem[1].fileItem;

      // 如果当前任务节点的文件被修改过，则需要更新依赖它的文件内容中的Hash文件名
      if (task.fileItem.isDirty) {
        // 更新文件内容中的Hash文件名，set钩子将自动更新Hash文件名
        dependencyItemFile.fileContent = dependencyItemFile.fileContent.replaceAll(
          task.fileItem.hashBaseNamePrev,
          task.fileItem.hashBaseName
        );

        // 如果文件被修改过，则将其加入到下一轮任务集合中
        if (dependencyItemFile.isDirty) {
          nextTask.push(dependencyItem[1]);
        }
      }
    }
  });

  return execReCalculationHash(nextTask, depth + 1);
}

/**
 * 递归重算文件Hash名称并进行文件重命名，此函数为包装函数，递归函数在内部实现
 * @param {*} allFiles 当前轮次所有文件列表（最新的，文件列表会受到重命名东西影响，会出现变动）
 * @param {*} modifyFiles 当前轮次需要重命名的文件列表
 * @param {*} ignoreDir 忽略的目录
 * @returns
 */
async function recalculateHashUseTree(allFiles, modifyFiles, ignoreDir) {
  // 当前Promise 任务集
  let currentTask = [];
  // 当前所有文件节点（基础数据）
  const allFileItem = [];
  // 当前所有文件树节点（树形结构数据）
  const allTreeNode = [];
  // 下一轮文件更新任务集合
  let nextFileTask = [];

  const isWindows = process.platform === 'win32';

  // ignoreDir 包含的文件夹不参与Hash重算，从allFiles中过滤掉
  const ignoreDirCorrect = ignoreDir
    ? `(?<=${isWindows ? path.sep + path.sep : path.sep})(${ignoreDir
        // 此处如果是Windows平台，需要对分隔符进行双转义，不然正则表达式会报错，如果是Linux，其实可以不用转义，只是统一处理了
        .replaceAll('/', isWindows ? path.sep + path.sep : path.sep)
        .replaceAll(',', '|')})`
    : null;
  const ignoreDirRegex = new RegExp(ignoreDirCorrect);

  // 初始化所有文件节点，init动作中会计算文件MD5
  allFiles
    // 如果存在过滤配置，则过滤掉不需要参与重算的文件
    .filter(i => (ignoreDirCorrect ? ignoreDirRegex.test(i) : true))
    .forEach(filePath => {
      // 构建文件包装节点
      const fileItem = new FileHelper(filePath);
      allFileItem.push(fileItem);
      currentTask.push(fileItem.init());
      // 构建文件树节点
      const fileTreeNode = new FileTreeNode(fileItem);
      allTreeNode.push(fileTreeNode);

      // 如果当前文件位于待办任务中，则将其加入到下一轮任务集合中
      if (modifyFiles.has(filePath)) {
        // 标记文件为脏数据，引导后续更新任务进入
        fileTreeNode.fileItem.isDirty = true;
        nextFileTask.push(fileTreeNode);
      }
    });

  await Promise.all(currentTask);

  // 构建文件关系引用树（只针对被影响的文件树子树进行构建，全量构建,时间复杂度不可容忍）
  buildFileTree(allTreeNode, nextFileTask);

  // 递归重算Hash
  execReCalculationHash(nextFileTask);

  // 找出所有被修改过的文件，进行文件重命名
  const renameTask = allFileItem.filter(fileItem => fileItem.isDirty);

  currentTask = renameTask.map(async task => {
    await FileHelper.writeFileContent(task.filePath, task.fileContent);
    const newPath = task.filePath.replace(task.baseName, task.hashBaseName);
    await fse.rename(task.filePath, newPath);
  });

  await Promise.all(currentTask);
}

module.exports = { recalculateHashUseTree };
