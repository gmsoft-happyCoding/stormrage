class EnvHelper {
  /**
   * 将环境变量写入到当前环境中
   * @param {*} envConf 环境变量配置
   * @param {*} overwrite 是否进行覆盖式写入
   * @returns 返回已经定义的环境变量Key（可以理解为冲突的）
   */
  static writeEnv(envConf, overwrite = true) {
    // 将配置写进环境变量
    const conflictEnv = [];
    for (const k in envConf) {
      if (Object.hasOwnProperty.call(envConf, k)) {
        const v = envConf[k];
        if (Object.hasOwnProperty.call(process.env, k)) {
          conflictEnv.push(k);
          if (overwrite) {
            process.env[k] = v;
          }
        } else {
          process.env[k] = v;
        }
      }
    }

    return conflictEnv;
  }
}

module.exports = { EnvHelper };
