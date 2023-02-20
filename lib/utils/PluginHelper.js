const { AsyncSeriesWaterfallHook } = require('tapable');

class PluginHelper {
  constructor() {
    this.hook = new AsyncSeriesWaterfallHook(['context']);
  }

  static freezeContext(obj) {
    Object.freeze(obj);
    Object.keys(obj).forEach((key, i) => {
      if (typeof obj[key] === 'object' && key !== 'config') {
        this.freezeContext(obj[key]);
      }
    });
  }

  use(plugin) {
    this.hook.tapPromise('stormrage-fis-plugin', plugin);
  }

  add = this.use;
  push = this.use;

  async apply(context) {
    PluginHelper.freezeContext(context);
    const newContext = await this.hook.promise(context);
    return newContext;
  }
}

module.exports = {
  PluginHelper,
};
