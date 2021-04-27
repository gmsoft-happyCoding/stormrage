const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { configResolve } = require('./utils/path-resolve');
const { mapValues, forEach, flowRight: compose, split, join, drop, has } = require('lodash');
const errorCode = require('../errorCode');

// remove @ symbol
const dropAt = (key) => join(drop(split(key, '')), '');

// 判断在组件描述中是否有标识存在
const isInDescription = (meta, flag) => meta && meta.description && meta.description.includes(flag);

// 新版的 docgen 返回的结构把 jsdoc 解析放到了 tags 中
const isInTags = (meta, flag) => has(meta.tags, dropAt(flag));

// flag 是否存在 描述 或者 tags 中
const hasFlag = (meta, flag) => isInDescription(meta, flag) || isInTags(meta, flag);

const isJSONObject = (s) => /^\{.*\}$/.test(s);

const paths = require(configResolve('paths'));

const exportComponents =
  global.PICK_EXPORT_COMPONENTS || require(configResolve('exportComponents'));

/**
 * 排除 redux 注入的 props 和 第三方库的props
 * @param {Object} prop 组件的prop元数据
 */
const propFilter = (prop) => {
  const parentName = prop.parent && prop.parent.name;
  // redux props
  const reduxProps = parentName === 'DispatchProps' || parentName === 'StateProps';
  // lib props
  const libProps = prop.parent && prop.parent.fileName.includes('node_modules');
  return !reduxProps && !libProps;
};

const docgen = require('react-docgen-typescript').withCustomConfig(paths.appTsConfig, {
  propFilter,
  shouldExtractLiteralValuesFromEnum: true,
});

/**
 * 为 props 增加 workflow 标识
 * 删除描述中的 `@workflow`
 * 增加属性 workflowFlag: true
 * @param {Object} meta 元数据
 */
const flagWorkflowProps = (meta) => {
  const flag = '@workflow';
  const props = mapValues(meta && meta.props, (prop) => {
    if (prop.description.includes(flag)) {
      return {
        ...prop,
        description: prop.description.replace(flag, ''),
        workflowFlag: true,
      };
    } else {
      return prop;
    }
  });

  return { ...meta, props };
};

/**
 * 为 props 设置 枚举值为指定的联合类型
 * react-docgen-typescript 不能解析枚举为联合类型
 * 保留组件描述中的 `@enumType x | y | z`, 可在文档中查看
 * @param {Object} meta 元数据
 */
const setEnumTypeProps = (meta) => {
  const regx = /@enumType\s*(.*)\n?/;
  const flag = '@enumType';
  const props = mapValues(meta && meta.props, (prop) => {
    if (prop && prop.description && prop.description.includes(flag)) {
      try {
        const enumType = prop.description.match(regx)[1];
        /**
         * 删除可能存在的多余空格和引号
         */
        let items = enumType
          .split('|')
          .map((i) => `"${i.replace(/('|")/g, '').trim()}"`)
          .join(' | ');

        /**
         * 非必填, 加上undefined
         */
        if (!prop.required) {
          items = `${items} | undefined`;
        }
        return {
          ...prop,
          type: { ...prop.type, name: items },
        };
      } catch (e) {
        console.log(
          `解析 @enumType 失败, 请检查组件 ${meta.displayName || ''} - ${prop.name} 注解是否正确`,
          e
        );
        process.exit(errorCode.BUILD_ERROR);
      }
    }

    return prop;
  });

  return { ...meta, props };
};

/**
 * 为 组件 增加 workflow 标识
 * 删除组件描述中的 `@workflow`
 * 增加属性 workflowFlag: true
 * @param {Object} meta 元数据
 */
const flagWorkflowComponent = (meta) => {
  const flag = '@workflow';

  if (hasFlag(meta, flag)) {
    return { ...meta, description: meta.description.replace(flag, ''), workflowFlag: true };
  }

  return meta;
};

/**
 * 为 组件 设置 vs(Validation strategy) 验证策略
 * 删除组件描述中的 `@vs xxx`
 * 增加属性 _vs
 * @param {Object} meta 元数据
 */
const setVSComponent = (meta) => {
  const regx = /@vs\s*(\{.*\}|\S*)/;
  const tagRegx = /\s*(\{.*\}|\S*)/;
  const flag = '@vs';
  if (hasFlag(meta, flag)) {
    try {
      const vs = isInDescription(meta, flag)
        ? meta.description.match(regx)[1]
        : meta.tags[dropAt(flag)].match(tagRegx)[1];
      return {
        ...meta,
        description: meta.description.replace(regx, ''),
        _vs: isJSONObject(vs) ? JSON.parse(vs) : vs,
      };
    } catch (e) {
      console.log(`解析 @vs 失败, 请检查组件 ${meta.displayName || ''} 注解是否正确`, e);
      process.exit(errorCode.BUILD_ERROR);
    }
  }

  return meta;
};

/**
 * 判断 path 是不是 tsx 文件
 * 如果是返回包含扩展名的完整路径
 * 否则返回 null
 * @param {string} file 源文件路径
 */
const tsxFile = (file) => {
  // 自动增加的文件后缀
  const ext = '.tsx';
  const _file = file.endsWith(ext) ? file : `${file}${ext}`;
  try {
    return fs.statSync(_file).isFile() ? _file : null;
  } catch (e) {
    return null;
  }
};

/**
 * 判断 目录下是否有同名的文件
 * @param {string} directory 源文件所在目录
 */
const sameNameFile = (directory) => {
  try {
    if (!fs.statSync(directory).isDirectory()) return null;
  } catch (e) {
    return null;
  }
  return tsxFile(path.join(directory, path.basename(directory)));
};

/**
 * 判断 目录下是否有index.tsx
 * @param {string} directory 源文件所在目录
 */
const indexFile = (directory) => {
  try {
    if (!fs.statSync(directory).isDirectory()) return null;
  } catch (e) {
    return null;
  }
  return tsxFile(path.join(directory, 'index'));
};

/**
 * 解析文件, 生成元数据
 * @param {string} file 源文件
 */
const parseFile = (file) => {
  const metaRaw = docgen.parse(file)[0];
  if (!metaRaw) {
    console.log(
      chalk.red(
        `组件 ${file} 提取元数据失败,\n
        请检查组件写法是否不被 react-docgen-typescript 支持(例如: props解构和ref一起使用了)\n
        或者组件既没有[描述信息]也没有[props], 请为组件增加描述信息(注释)`
      )
    );
    return process.exit(errorCode.BUILD_ERROR);
  }
  const meta = compose(
    setEnumTypeProps,
    flagWorkflowProps,
    setVSComponent,
    flagWorkflowComponent
  )(metaRaw);
  return meta;
};

/**
 * 保存元数据
 * @param {string} componentName 组件名称
 * @param {Object} meta 元数据
 */
const writeFile = (componentName, meta) => {
  const filePath = path.join(paths.appBuild, 'meta', `${componentName}.json`);
  fs.ensureFileSync(filePath);
  fs.writeFileSync(filePath, meta);
};

function run() {
  console.log(chalk.yellow('提取组件元数据...'));
  const metaPath = path.join(paths.appBuild, 'meta');
  fs.mkdirsSync(metaPath);
  fs.emptyDirSync(metaPath);
  forEach(exportComponents, (component, componentName) => {
    /**
     *  优先级依次递减
     */
    const file = tsxFile(component) || sameNameFile(component) || indexFile(component);
    if (file) {
      const meta = parseFile(file);
      writeFile(componentName, JSON.stringify(meta, null, 2));
      console.log(chalk.cyan(componentName));
    }
  });
  console.log(chalk.yellow('提取组件元数据完成!'));
}

run();
