const path = require('path');
const lodash = require('lodash');
const axios = require('axios');
const yaml = require('js-yaml');

class ConfHelper {
  // 优先从环境变量中获取，如果没有获取到，则使用硬编码的配置获取路径
  static CONF_BASEURL = process.env.GMSOFT_CONF_BASEURL ?? 'http://192.168.2.10:9110';
  static ENV_SUFFIX = '.ci_env_suffix';

  /**
   * 将嵌套的配置对象降维成简单的环境变量配置对象，环境变量key变更为key的路径
   * @param {*} conf 需要降维的配置对象
   * @param {*} _parentKey 递归参数，外层调用时禁止传递此参数
   */
  static convertConfToEnvironment(conf, _parentKey) {
    let temp = {};
    const keys = lodash.keys(conf);
    keys.forEach(key => {
      const currentKey = lodash.compact([_parentKey, key]).join('.');
      if (typeof conf[key] === 'object') {
        const result = this.convertConfToEnvironment(conf[key], currentKey);
        temp = { ...temp, ...result };
        return;
      }
      temp[currentKey] = conf[key];
    });
    return temp;
  }

  /**
   * 获取远端YML配置,返回JS对象
   * @param {*} url 配置路径
   */
  static async getYmlConfig(url, timeout = 3000) {
    const { data } = await axios.get(url, { timeout });
    return yaml.load(data, 'utf8');
  }

  /**
   * 获取顶层基础配置信息
   */
  static async getBaseConfig() {
    const url = `${this.CONF_BASEURL}/none/application-1.yml`;
    return await this.getYmlConfig(url);
  }

  /**
   * 获取对应环境、机房的配置信息
   * @param {string} rootDir 当前项目根路径（如果是mono项目，此处指的是mono项目的根路径，而不是子项目的根路径）
   * @param {string} env 目标环境
   * @param {string} room 目标机房
   * @param {string} [undefine] fileName 所使用的的目标配置文件名，不传递的话，将根据当前执行环境自动判断
   * @param {string} [1] confLabel 目标配置文件标签名（一般情况不需要传递）
   */
  static getConfigUrl(rootDir, env, room, fileName, confLabel = 1) {
    let confFileName = fileName;

    if (!confFileName) {
      // 尝试根据当前环境去获取配置文件
      const confName = path.parse(rootDir).name.toLowerCase().replaceAll('-', '');
      // TODO 此处的命名规则需要明确，暂定
      confFileName = `front_${confName}`;
    }

    const confFileNamePattern = new RegExp(`-${confLabel}\.yml$`);
    const appendPattern = new RegExp(`(\.yml)?$`);
    // 如果不是以标签结尾的文件名称，则为其添加标签（蒲总使用的配置中间件必须要一个配置标签，一般情况下不需要额外处理，按照下述流程走即可）
    if (!confFileNamePattern.test(confFileName)) {
      confFileName = confFileName.replace(appendPattern, `-${confLabel}.yml`);
    }

    // 样例链接：http://192.168.2.10:9110/test1(_)xcj/xcjfonlineassessment-1.yml
    return `${this.CONF_BASEURL}/${env}(_)${room}/${confFileName}`;
  }

  /**
   * 获取所有的可用机房信息，这些机房信息只是在配置信息中有描述，可能并不存在实际的配置文件
   * @param {*} conf 由getBaseConfig返回的基础配置信息
   */
  static getAllRoom(conf) {
    try {
      return lodash.values(conf.deployconfig.dypoint);
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取所有机房的环境配置集合（并集）
   * @param {string} rootDir 当前项目根路径（如果是mono项目，此处指的是mono项目的根路径，而不是子项目的根路径）
   * @param {string []} rooms 可用的房间信息
   */
  static async getFullEnvConf(rootDir, rooms) {
    let envConf = {};
    let allConf = [];

    // 配置服务吃不住并发，改为串行获取，如果后续可以支撑并发的话，启用下面的代码段，将大幅提高配置获取速度
    // const allTask = [];
    // for (const room of rooms) {
    //   const confUrl = this.getConfigUrl(rootDir, 'test1', room);
    //   allTask.push(this.getYmlConfig(confUrl, 5000));
    // }
    // const results = await Promise.allSettled(allTask);
    // allConf = results.filter(result => result.status === 'fulfilled').map(result => result.value);

    // 串行配置获取
    for (const room of rooms) {
      const confUrl = this.getConfigUrl(rootDir, 'test1', room);
      try {
        allConf.push(await this.getYmlConfig(confUrl, 5000));
      } catch (error) {
        // 静默失败，获取不到的机房直接跳过即可
        console.log('[*] room: %s, Cannot find configuration file, ignored.', room);
      }
    }

    // TODO 此处的环境变量枚举表应该提供自行指定的能力
    const envWhiteList = ['business', 'hosts', 'gateway', 'pdf-preview'];
    allConf = allConf.map(conf => {
      // 仅枚举前端需要的部分配置项目即可
      const confPart = lodash.pick(conf, envWhiteList);
      // 将环境变量降维展开,转变为一维结构
      const flattedConf = this.convertConfToEnvironment(confPart);
      return flattedConf;
    });

    // 将所有有效的环境配置对象合并
    envConf = allConf.reduce((prev, curr) => ({ ...prev, ...curr }), {});
    // 将所有的环境变量值转换为占位符
    envConf = lodash.mapValues(envConf, (_, k) => `${k}${this.ENV_SUFFIX}`);
    // 在环境变量上标记出来此次Make所枚举的环境变量Key的模式，后续编译过程会用到
    envConf.GMSOFT_ENV_FILTER = `^(${envWhiteList.join('|')})`;
    // 默认开启Source Map，方便内部调试，在部署线上环境时，增加尾处理，删除sourcemap相关文件即可
    envConf.REACT_APP_GENERATE_SOURCEMAP = true;

    return envConf;
  }
}

module.exports = { ConfHelper };
