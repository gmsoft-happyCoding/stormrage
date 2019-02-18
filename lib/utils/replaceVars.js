function replaceVars(contents, vars) {
  let result = contents;
  for (let key in vars) {
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      vars[key]
    );
  }
  return result;
}

module.exports = replaceVars;
