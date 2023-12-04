const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const lodash = require('lodash');
const axios = require('axios');
const chalk = require('chalk');
const yaml = require('js-yaml');
const inquirer = require('inquirer');
const program = require('commander');
const produce = require('immer').default;
const { ErrorHelper, ErrorCode } = require('./ErrorHelper');
const { SvnHelper } = require('./SvnHelper');
const { FileHelper } = require('./FileHelper');
const { PluginHelper } = require('./PluginHelper');
const { isFisProject } = require('../project-info/isProject');

class ConfHelper {
  /** 获取配置的资源地址，优先从环境变量中获取，如果没有获取到，则使用硬编码的配置获取路径 */
  static CONF_BASEURL = process.env.GMSOFT_CONF_BASEURL ?? 'http://192.168.2.10:9110';
  /** 配置文件存放的实际SVN地址 */
  static CONF_BASEURL_SVN =
    process.env.GMSOFT_CONF_BASEURL_ENV ??
    'https://192.168.2.10:8080/svn/GovProEleTrade/deploy-conf';
  /** 环境变量占位符后缀，增加的后缀，降低出现碰撞的可能性 */
  static ENV_SUFFIX = '.ci_env_suffix';
  /** 默认配置字段名：业务配置 */
  static CONF_DEFAULT_FIELD_NAME = 'business';
  /** 默认配置字段名：编译配置 */
  static CONF_DEFAULT_COMPILE_NAME = 'compile';
  /** 默认配置字段名：域名配置 */
  static CONF_DEFAULT_HOSTS_NAME = 'hosts';
  /** 默认配置字段名：网关配置 */
  static CONF_DEFAULT_GATEWAY_NAME = 'gateway';
  /** 默认配置字段名：PDF预览地址 */
  static CONF_DEFAULT_PDF_PREVIEW_NAME = 'pdf-preview';
  /** 取得配置文件参考默认使用的环境 */
  static CONF_DEFAULT_ENV = 'test1';
  /** 项目描述文件名称 */
  static PROJECT_META_FILE = 'package.json';
  /** 默认项目发布环境配置 */
  static PROJECT_DEFAULT_CONF_FILE = 'default-env.json';
  /** 配置文件前缀名称 */
  static CONF_PREFIX = 'front_';
  /** 默认发布配置的文件名 */
  static CONF_DEFAULT_DEPLOY_FILENAME = 'app_deployToStrategy';
  /** 机房描述文件文件名称 */
  static CONF_DEFAULT_MACHINES_FILENAME = 'app_machines';
  /** 特殊环境名，仅用作某些基础配置获取时使用 */
  static CONF_SYSTEM_ENV = 'none';
  /** 基础配置文件文件名 */
  static CONF_BASE_FILENAME = 'application';
  /** CI 操作流水线自动识别文件夹名称 */
  static CONF_CI_OPERATOR_DETECTED_DIR = 'ZOperate';

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

      if (lodash.isNil(conf[key])) {
        console.log(`[WARN] 发现空配置段：${key}，请留意。`);
        temp[currentKey] = '';
        return;
      }

      // 仅对Object进行key降维，值为数组类型的不进行降维
      if (
        !lodash.isNil(conf[key]) &&
        typeof conf[key] === 'object' &&
        conf[key].constructor !== Array
      ) {
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
   * @param {*} uri 配置路径
   */
  static async getYmlConfig(uri, timeout = 3000) {
    try {
      let data = null;
      const urlHeaderPattern = /^(https?:)?\/\/.+/;
      if (urlHeaderPattern.test(uri)) {
        ({ data } = await axios.get(uri, { timeout }));
      } else {
        // 非网络URL，尝试使用本路径进行解析
        data = fs.readFileSync(uri);
      }
      return yaml.load(data, 'utf8');
    } catch (error) {
      ErrorHelper.throwError(ErrorCode.ERROR_GET_CONFIG_FAILED, error.message);
    }
  }

  /**
   * 获取顶层基础配置信息
   */
  static async getBaseConfig() {
    const url = `${this.CONF_BASEURL}/${this.CONF_SYSTEM_ENV}/${this.CONF_BASE_FILENAME}-1.yml`;
    return await this.getYmlConfig(url);
  }

  /**
   * 根据传入的项目目录以及配置文件名，产生配置文件名
   * @param {*} rootDir 项目目录
   * @param {*} fileName 明确的配置文件名
   * @returns
   */
  static getConfFileName(rootDir, fileName) {
    let confFileName = fileName;

    if (!confFileName) {
      // 尝试根据当前环境去获取配置文件,规则：项目名去除短横线，转小写
      const projectInfo = fs.readJSONSync(path.resolve(rootDir, ConfHelper.PROJECT_META_FILE));
      const confName = projectInfo.name.toLowerCase().replaceAll('-', '');
      // TODO 此处的命名规则需要明确，暂定
      confFileName = `${this.CONF_PREFIX}${confName}`;
    }

    return confFileName.replace(/\.yml$/, '');
  }

  static replaceEnvForSelf(envObj) {
    const env = {};

    const placeholderPattern = /(?<=\$\{).+?(?=\})/g;

    const allKey = lodash.keys(envObj);

    lodash.forIn(envObj, (val, key) => {
      let tempVal = String(val);
      // 提取Value中的占位符
      const placeholder = tempVal.match(placeholderPattern);
      // 求取占位符与所有Key的交集，如果交集不为空，则说明当前Key是一个占位符，需要进行替换
      const keyIntersection = lodash.intersection(allKey, placeholder);

      if (placeholder && keyIntersection.length > 0) {
        keyIntersection.forEach(k => {
          const replaceVal = lodash.get(envObj, k);
          tempVal = tempVal.replace(`\${${k}}`, replaceVal);
        });
        env[key] = tempVal;
      } else {
        env[key] = val;
      }
    });

    return env;
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
    let confFileName = this.getConfFileName(rootDir, fileName);
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
   * 获取环境变量白名单顶级Key匹配Pattern
   * @param {*} envConf 当前环境变量
   */
  static getEnvWhitelist(envConf) {
    return Object.keys(envConf);
  }

  /**
   * 处理选择型的编译环境变量
   * @param {*} env 原始环境变量
   * @returns
   */
  static async dealWithCompileEnv(env) {
    const { pluginOption = {} } = program.opts();
    const questions = [];
    const compileEnv = lodash.pick(
      env,
      lodash.keys(env).filter(key => key.startsWith(ConfHelper.CONF_DEFAULT_COMPILE_NAME))
    );
    lodash.mapValues(compileEnv, (value, key) => {
      if (lodash.isArray(value)) {
        questions.push({
          type: 'list',
          // 选项均需要以 compile. 开头，因为这是Make时的环境变量，其他环境变量会被替换为占位符，无法达到条件编译的效果
          name: key,
          message: `请选择make参数:${key}`,
          choices: value.map(item => ({
            name: item?.name ?? item,
            value: item?.value ?? item,
          })),
        });
      }
    });

    // 如果pluginOption已经设置了环境变量，则不再询问，直接pluginOption的配置进行注入即可
    const realQuestion = questions.filter(q => lodash.isNil(pluginOption[q.name]));

    const answers = await inquirer
      .prompt(realQuestion)
      // flatConf 用于将配置扁平化，因为questions中的name包含了点号，_answers会被解析为一个嵌套的复杂对象，需要转换为简单对象
      // 默认_answers的结构为：{ compile: { MAKE_PLATFORM: 'ZCJ' } }
      // flatConf后的结构为：{ 'compile.MAKE_PLATFORM': 'ZCJ' }
      .then(_answers => ({ ...pluginOption, ...this.convertConfToEnvironment(_answers) }));

    return { ...env, ...answers };
  }

  /**
   * 获取项目默认配置信息
   * @param {*} opt
   * @param {*} usePlugin
   */
  static async getProjectDefaultConf(opts, usePlugin = false) {
    const { rootDir, confName, envField } = opts || {};

    let envConf = {};

    const isFisEnv = isFisProject(rootDir);

    const confFilePath = path.resolve(
      rootDir,
      isFisEnv ? 'project-conf/media' : 'project-config',
      confName || 'default.yml'
    );

    const defaultConfOriginal = await this.getYmlConfig(confFilePath, 5000);

    const envWhiteList = this.getEnvWhitelist(defaultConfOriginal);

    // 不再过滤环境变量配置白名单
    const confPart = defaultConfOriginal;

    const projectMetaInfo = fs.readJSONSync(path.resolve(rootDir, this.PROJECT_META_FILE));
    // 处理project-name降级
    confPart.business['project-name'] = confPart.business['project-name'] ?? projectMetaInfo.name;
    // 将环境变量降维展开,转变为一维结构
    let originalEnvConf = this.convertConfToEnvironment(confPart);

    originalEnvConf = await this.dealWithCompileEnv(originalEnvConf);

    if (usePlugin) {
      // 运行插件，对环境变量进行额外处理，将读取项目project-config/plugins下，所有文件名以make.js结尾的插件文件，并全部进行应用，不保证插件应用顺序
      const pluginQueue = new PluginHelper();
      FileHelper.getAllFile(
        path.join(rootDir, isFisEnv ? 'project-conf/plugins' : 'project-config/plugins'),
        ['make.js']
      ).forEach(pluginPath => {
        const plugin = require(pluginPath);
        if (lodash.isFunction(plugin)) {
          pluginQueue.add(plugin);
        }
      });
      const { pluginOption } = program.opts();
      const { env } = await pluginQueue.apply({
        inquirer,
        produce,
        pluginOption,
        env: originalEnvConf,
        flatConf: this.convertConfToEnvironment.bind(this),
      });
      originalEnvConf = env;
    }

    // 将所有的环境变量值转换为占位符
    envConf = lodash.mapValues(originalEnvConf, (v, k) =>
      // 编译参数选项不需要进行转换（）
      k.startsWith(this.CONF_DEFAULT_COMPILE_NAME) ? v : `${k}${this.ENV_SUFFIX}`
    );

    // ==================================================== 特殊环境变量写入 ====================================================
    // 在环境变量上标记出来此次Make所枚举的环境变量Key的模式，后续编译过程会根据此环境变量进行环境变量过滤
    envConf.GMSOFT_ENV_FILTER = `^(${envWhiteList
      .filter(i => i !== ConfHelper.CONF_DEFAULT_COMPILE_NAME)
      .join('|')})`;
    // 默认开启Source Map，方便内部调试，在部署线上环境时，增加尾处理，删除sourcemap相关文件即可
    envConf.REACT_APP_GENERATE_SOURCEMAP = true;

    // 判断配置中是否包含预设的业务配置段，如果没有，则给出警告
    const hasBusinessConf =
      Object.keys(envConf).filter(key => key.startsWith(this.CONF_DEFAULT_FIELD_NAME)).length > 0;
    if (!hasBusinessConf) {
      console.log(
        chalk.yellow('[WARN] 发现环境变量不存在business配置段，请检查配置文件是否正确！')
      );
    }
    return { envConf, originalEnvConf };
  }

  /**
   * 获取所有机房的环境配置集合（并集）
   * @param {Object} opt - 参数对象
   * @param {string} opt.rootDir - 当前项目根路径（如果是mono项目，此处指的是mono项目的根路径，而不是子项目的根路径）
   * @param {string []} opt.rooms - 可用的房间信息
   * @param {string} opt.confName 使用的配置文件名称，可以没有yml后缀，自动适配
   * @param {string} opt.envName 环境变量构建所使用的的环境名，默认test1
   * @param {string} opt.confLabel 环境变量构建所使用Label，标注环境变量文件Label
   * @param {boolean} usePlugin 是否使用插件
   */
  static async getFullEnvConf(opt, usePlugin = false) {
    const { rootDir, rooms, confName, envName = 'test1', confLabel } = opt;
    const ignoredEnvRoom = [];
    let envConf = {};
    let allConf = [];

    // 串行配置获取
    for (const room of rooms) {
      if (!(await this.confFileIsExist(envName, room, confName, rootDir))) {
        // 文件不存在直接跳过
        ignoredEnvRoom.push([envName, room].join('-'));
        continue;
      }

      const confUrl = this.getConfigUrl(rootDir, envName, room, confName, confLabel);
      try {
        allConf.push(await this.getYmlConfig(confUrl, 5000));
      } catch (error) {
        // 静默失败，获取不到的机房直接跳过即可
        console.log('[*] room: %s, Cannot find configuration file, ignored.', room);
      }
    }

    if (!lodash.isEmpty(ignoredEnvRoom)) {
      console.log(
        chalk.magenta(`[INFO] 以下环境不存在配置文件，请留意：\n${ignoredEnvRoom.join('\n')}`)
      );
    }

    if (lodash.isEmpty(allConf)) {
      // 未获取到任何配置，读取项目基础信息，使用默认配置进行编译
      const defaultConfUrl = this.getConfigUrl(rootDir, envName, 'zcj', 'default', confLabel);
      const defaultConf = await this.getYmlConfig(defaultConfUrl, 5000);
      const projectInfo = fs.readJSONSync(path.resolve(rootDir, this.PROJECT_META_FILE));
      defaultConf.business = {
        'project-name': projectInfo.name,
        'public-url': `/${projectInfo.name}`,
      };
      allConf.push(defaultConf);
      // 不再抛出异常
      // ErrorHelper.throwError(ErrorCode.ERROR_MAKE_CONF_EMPTY);
    }

    allConf = allConf.map(conf => {
      // 将环境变量降维展开,转变为一维结构
      return this.convertConfToEnvironment(conf);
    });

    // 将所有有效的环境配置对象合并
    let originalEnvConf = allConf.reduce((prev, curr) => ({ ...prev, ...curr }), {});
    // 应用环境变量默认处理插件
    originalEnvConf = await this.dealWithCompileEnv(originalEnvConf);

    if (usePlugin) {
      // 运行插件，对环境变量进行额外处理，将读取项目project-config/plugins下，所有文件名以make.js结尾的插件文件，并全部进行应用，不保证插件应用顺序
      const pluginQueue = new PluginHelper();
      FileHelper.getAllFile(
        path.join(
          rootDir,
          isFisProject(rootDir) ? 'project-conf/plugins' : 'project-config/plugins'
        ),
        ['make.js']
      ).forEach(pluginPath => {
        const plugin = require(pluginPath);
        if (lodash.isFunction(plugin)) {
          pluginQueue.add(plugin);
        }
      });
      const { pluginOption } = program.opts();
      const { env } = await pluginQueue.apply({
        inquirer,
        produce,
        pluginOption,
        env: originalEnvConf,
        flatConf: this.convertConfToEnvironment.bind(this),
      });
      originalEnvConf = env;
    }

    // 将所有的环境变量值转换为占位符
    envConf = lodash.mapValues(originalEnvConf, (v, k) =>
      // 编译参数选项不需要进行转换（）
      k.startsWith(this.CONF_DEFAULT_COMPILE_NAME) ? v : `${k}${this.ENV_SUFFIX}`
    );

    // ==================================================== 特殊环境变量写入 ====================================================
    // 在环境变量上标记出来此次Make所枚举的环境变量Key的模式，后续编译过程会根据此环境变量进行环境变量过滤
    envConf.GMSOFT_ENV_FILTER = `^(${envWhiteList
      .filter(i => i !== ConfHelper.CONF_DEFAULT_COMPILE_NAME)
      .join('|')})`;
    // 默认开启Source Map，方便内部调试，在部署线上环境时，增加尾处理，删除sourcemap相关文件即可
    envConf.REACT_APP_GENERATE_SOURCEMAP = true;

    // 判断配置中是否包含预设的业务配置段，如果没有，则给出警告
    const hasBusinessConf =
      Object.keys(envConf).filter(key => key.startsWith(this.CONF_DEFAULT_FIELD_NAME)).length > 0;
    if (!hasBusinessConf) {
      console.log(
        chalk.yellow(
          '[WARN] 发现环境变量不存在business配置段，当前项目在目标环境下的任何机房可能都不存在配置文件，或您手动指定的配置文件名有误，请核查正确性；处理过程将继续，但产出的结果大概率是错误的！'
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
    return `https://${(url || '').replace(delProtocolPattern, '')}`;
  }

  /**
   * 获取所有可用的环境名
   * @returns
   */
  static async getAllEnvs() {
    const confIsExist = await SvnHelper.dirIsExist(this.CONF_BASEURL_SVN);
    if (!confIsExist) {
      ErrorHelper.throwError(
        ErrorCode.ERROR_REMOTE_DIR_INVALID,
        `尝试获取远端配置失败，远端地址：${this.CONF_BASEURL_SVN}`
      );
    }

    const files = await SvnHelper.getList(this.CONF_BASEURL_SVN);
    const allEnv = files
      .filter(file => lodash.get(file, '$.kind') === 'dir' && file.name !== this.CONF_SYSTEM_ENV)
      .map(i => i.name);
    return allEnv;
  }

  // 获取所有机房编码信息
  static async getAllRooms(conf) {
    const baseConf = conf ? conf : await this.getBaseConfig();
    const dypoint = lodash.get(baseConf, 'deployconfig.dypoint', {});
    const allRoom = lodash.values(dypoint);
    return allRoom;
  }

  // 获取所有机房描述信息
  static async getAllRoomsCommons(conf) {
    const baseConf = conf ? conf : await this.getBaseConfig();
    const dypoint = lodash.get(baseConf, 'deployconfig.dypoint', {});
    const rooms = [];
    lodash.forIn(dypoint, (roomName, roomCode) => {
      rooms.push([roomCode, roomName].join('-'));
    });
    return rooms.join(',');
  }

  static async confFileIsExist(envName, room, confName, rootDir) {
    const confFileName = this.getConfFileName(rootDir, confName);
    const confSVNPath = `${this.CONF_BASEURL_SVN}/${envName}/${room}/${confFileName}.yml`;
    const confIsExist = await SvnHelper.fileIsExist(confSVNPath);
    return confIsExist;
  }
}

module.exports = { ConfHelper };
