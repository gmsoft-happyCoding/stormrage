const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const lodash = require('lodash');
const axios = require('axios');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');

class ConfHelper {
  // 优先从环境变量中获取，如果没有获取到，则使用硬编码的配置获取路径
  static CONF_BASEURL = process.env.GMSOFT_CONF_BASEURL ?? 'http://192.168.2.10:9110';
  /** 环境变量占位符后缀，增加的后缀，降低出现碰撞的可能性 */
  static ENV_SUFFIX = '.ci_env_suffix';
  /** 默认配置字段名 */
  static CONF_DEFAULT_FIELD_NAME = 'business';
  /** 取得配置文件参考默认使用的环境 */
  static CONF_DEFAULT_ENV = 'test1';
  /** 项目描述文件名称 */
  static PROJECT_META_FILE = 'package.json';
  /** 配置文件前缀名称 */
  static CONF_PREFIX = 'front_';
  /** 默认发布配置的文件名 */
  static CONF_DEFAULT_DEPLOY_FILENAME = 'app_deployToStrategy';
  /** 机房描述文件文件名称 */
  static CONF_DEFAULT_MACHINES_FILENAME = 'app_machines';

  /** 发布配置文件中的发布配置键名 */
  static CONF_DEFAULT_DEPLOY_FIELD_TO = 'deployto';
  /** 发布配置文件中的机房描述键名 */
  static CONF_DEFAULT_DEPLOY_FIELD_MACHINES = 'machines';
  /** 默认发布配置文件中对两类前端项目的默认配置键名-应用类型项目 */
  static CONF_DEFAULT_DEPLOY_FIELD_APP = 'front';
  /** 默认发布配置文件中对两类前端项目的默认配置键名-组件类型项目 */
  static CONF_DEFAULT_DEPLOY_FIELD_COMPONENT = 'front-webcomponent';

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
    try {
      const { data } = await axios.get(url, { timeout });
      return yaml.load(data, 'utf8');
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_CONFIG_TIME, error.message);
    }
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
      // 尝试根据当前环境去获取配置文件,规则：项目名去除短横线，转小写
      const projectInfo = fs.readJSONSync(path.resolve(rootDir, ConfHelper.PROJECT_META_FILE));
      const confName = projectInfo.name.toLowerCase().replaceAll('-', '');
      // TODO 此处的命名规则需要明确，暂定
      confFileName = `${this.CONF_PREFIX}${confName}`;
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

  // TODO 此函数应具备缓存能力，第二版实现
  /**
   * 获取所有机房的环境配置集合（并集）
   * @param {Object} opt - 参数对象
   * @param {string} opt.rootDir - 当前项目根路径（如果是mono项目，此处指的是mono项目的根路径，而不是子项目的根路径）
   * @param {string []} opt.rooms - 可用的房间信息
   * @param {string} opt.confName 使用的配置文件名称，可以没有yml后缀，自动适配
   * @param {string} opt.envName 环境变量构建所使用的的环境名，默认test1
   * @param {string} opt.envField 环境变量构建所使用的的额外的字段组
   * @param {string} opt.confLabel 环境变量构建所使用Label，标注环境变量文件Label
   */
  static async getFullEnvConf(opt) {
    const { rootDir, rooms, confName, envName = 'test1', envField, confLabel } = opt;
    let envConf = {};
    let allConf = [];

    /**
     * Description：
     * 当前处理过程需要获取大量的配置信息，组装成完成的配置表。对于网络请求应使用并行发送，但是由于配置服务吃不住并发，
     * 会导致请求超时，拿不到配置，改为串行获取，如果后续可以支撑并发的话，启用下面的并行代码段，将大幅提高配置获取速度
     * 并注释掉串行配置获取的代码段即可
     */

    // 并行配置获取
    // const allTask = [];
    // for (const room of rooms) {
    //   const confUrl = this.getConfigUrl(rootDir, envName, room, confName,confLabel);
    //   allTask.push(this.getYmlConfig(confUrl, 5000));
    // }
    // const results = await Promise.allSettled(allTask);
    // allConf = results.filter(result => result.status === 'fulfilled').map(result => result.value);

    // 串行配置获取
    for (const room of rooms) {
      const confUrl = this.getConfigUrl(rootDir, envName, room, confName, confLabel);
      try {
        allConf.push(await this.getYmlConfig(confUrl, 5000));
      } catch (error) {
        // 静默失败，获取不到的机房直接跳过即可
        console.log('[*] room: %s, Cannot find configuration file, ignored.', room);
      }
    }

    // 注入额外传入的环境变量段
    const extraFields = typeof envField === 'string' ? envField.split(',') : [];
    // 默认注入下面的四个配置段，整个环境变量段并不是所有的段都对前端有意义，暂定这四个段，如果有需要可以使用参数进行额外配置
    const envWhiteList = [
      this.CONF_DEFAULT_FIELD_NAME,
      'hosts',
      'gateway',
      'pdf-preview',
      ...extraFields,
    ];
    allConf = allConf.map(conf => {
      // 仅枚举前端需要的部分配置项目即可
      const confPart = lodash.pick(conf, envWhiteList);
      // 将环境变量降维展开,转变为一维结构
      const flattedConf = this.convertConfToEnvironment(confPart);
      return flattedConf;
    });

    if (lodash.isEmpty(allConf)) {
      ErrorHelper.throwError(ErrorCode.ERROR_MAKE_CONF_EMPTY);
    }

    // 将所有有效的环境配置对象合并
    const originalEnvConf = allConf.reduce((prev, curr) => ({ ...prev, ...curr }), {});
    // 将所有的环境变量值转换为占位符
    envConf = lodash.mapValues(originalEnvConf, (_, k) => `${k}${this.ENV_SUFFIX}`);
    // 在环境变量上标记出来此次Make所枚举的环境变量Key的模式，后续编译过程会用到
    envConf.GMSOFT_ENV_FILTER = `^(${envWhiteList.join('|')})`;
    // 默认开启Source Map，方便内部调试，在部署线上环境时，增加尾处理，删除sourcemap相关文件即可
    envConf.REACT_APP_GENERATE_SOURCEMAP = true;

    // 判断配置中是否包含预设的业务配置段，如果没有，则给出警告
    const hasBusinessConf =
      Object.keys(envConf).filter(key => key.startsWith(this.CONF_DEFAULT_FIELD_NAME)).length > 0;
    if (!hasBusinessConf) {
      console.log(
        chalk.yellow(
          '[WARN] 发现环境变量不存在business配置段，当前项目在目标环境下的任何机房可能都不存在配置文件，或您手动指定的配置文件名有误，请核查正确性。打包仍将继续，但产出的文件大概率是错误的！'
        )
      );
    }

    return { envConf, originalEnvConf };
  }

  /**
   * 传入字段Key，获取实际的占位符内容
   * @param {*} key
   * @returns 占位符
   */
  static getPlaceholderValue(key) {
    return `${key}${this.ENV_SUFFIX}`;
  }

  /** 获取私钥文件位置 */
  static getRsaFilePath() {
    return path.resolve(os.userInfo().homedir, '.ssh', 'id_rsa');
  }

  /**
   * 为URL添加协议头
   * @param {*} url 地址
   * @returns 带有协议头的地址
   */
  static addProtocol(url) {
    const protocolPattern = /^(http(s)?:)\/\//;
    const delProtocolPattern = /^(http(s)?:)?\/\//;
    if (protocolPattern.test(url)) {
      return url;
    }
    return `https://${url.replace(delProtocolPattern, '')}`;
  }
}

module.exports = { ConfHelper };
