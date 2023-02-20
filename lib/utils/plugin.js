const { AsyncSeriesWaterfallHook } = require('tapable');
const { PluginHelper } = require('./PluginHelper');

const hook = new AsyncSeriesWaterfallHook(['context']);

const HOOK_KEY = 'stormrageFisPlugin';

function use(plugin) {
  hook.tapPromise('stormrage-fis-plugin', plugin);
}

async function apply(context) {
  PluginHelper.freezeContext(context);
  const newContext = await hook.promise(context);
  return newContext;
}

module.exports = {
  use,
  apply,
};
