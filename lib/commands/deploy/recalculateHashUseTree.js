const path = require('path');
const { FileHelper, FileTreeNode } = require('../../../lib/utils/FileHelper');
// const { ErrorHelper, ErrorCode } = require('../../utils/ErrorHelper');

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
  // const startTime = Date.now();

  // 初始化所有文件节点，init动作中会计算文件MD5
  allFiles.forEach(filePath => {
    const fileItem = new FileHelper(filePath);
    allFileItem.push(fileItem);
    currentTask.push(fileItem.init());
    allTreeNode.push(new FileTreeNode(fileItem));
  });

  await Promise.all(currentTask);

  // const endTime = Date.now();

  // console.log((endTime - startTime) / 1000);
  throw new Error('abort');
}

module.exports = { recalculateHashUseTree };
