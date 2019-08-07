const { AsyncSeriesWaterfallHook } = require('tapable');

const hook = new AsyncSeriesWaterfallHook(['context']);

const HOOK_KEY = 'stromrageFisPlugin';

function use(plugin) {
  hook.tapPromise('stromrage-fis-plugin', plugin);
}

const freezeContext = obj => {
  Object.freeze(obj);
  Object.keys(obj).forEach((key, i) => {
    if (typeof obj[key] === 'object' && key !== 'config') {
      freezeContext(obj[key]);
    }
  });
};

async function apply(context) {
  freezeContext(context);
  const newContext = await hook.promise(context);
  return newContext;
}

module.exports = {
  use,
  apply,
};
