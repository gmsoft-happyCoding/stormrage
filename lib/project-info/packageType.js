// 模板类型
const PACKAGE_TYPE = {
  APP: 'app',
  COMMON: 'common',
  COMPONENTS: 'components',
};

const PACKAGE_TYPE_OPTIONS = Object.values(PACKAGE_TYPE);

module.exports = {
  packageType: PACKAGE_TYPE,
  packageTypeOptions: PACKAGE_TYPE_OPTIONS,
  isValid: p => PACKAGE_TYPE_OPTIONS.includes(p),
  isProjectPackage: p => p === PACKAGE_TYPE.APP || p === PACKAGE_TYPE.COMPONENTS,
};
