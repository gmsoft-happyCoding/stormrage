class DeployHelper {
  static DEFAULT_LOCAL_DEST_DIR = process.env.GMSOFT_LOCAL_DEST_DIR ?? 'D:\\发布结果';
}

module.exports = { DeployHelper };
