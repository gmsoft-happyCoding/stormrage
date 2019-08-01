function replaceEnvs(contents, envs) {
  let result = contents;
  for (let key in envs) {
    result = result.replace(new RegExp(`process\\.env\\.${key}`, 'g'), `'${envs[key]}'`);
  }
  return result;
}

module.exports = replaceEnvs;
