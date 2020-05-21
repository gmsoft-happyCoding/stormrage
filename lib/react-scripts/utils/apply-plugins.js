const loadConfig = require('./load-config');
const loadDefaultConfig = require('./load-default-config');
const { use, apply } = require('../../utils/plugin');
const buildContext = require('./build-context');

async function applyPlugins(pluginOption, env, room) {
  const config = env && room ? loadConfig(env, room) : loadDefaultConfig();

  const { plugins, ...projectConfig } = config;

  if (plugins && plugins.length > 0) {
    plugins.map(plugin => use(plugin));
  }

  const context = buildContext(projectConfig, pluginOption);

  const { inquirer, produce, pluginOption: _pluginOption, ...finalContext } = await apply(context);

  return finalContext;
}

module.exports = applyPlugins;
