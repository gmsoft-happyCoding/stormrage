function checkVersion(version, ranges) {
  // Helper function to split version into parts
  function parseVersion(v) {
    return v.split('.').map(Number);
  }

  // Helper function to compare two versions
  function compareVersions(v1, v2) {
    for (let i = 0; i < 3; i++) {
      if (v1[i] > v2[i]) return 1;
      if (v1[i] < v2[i]) return -1;
    }
    return 0;
  }

  // Helper function to check if a version matches a wildcard pattern
  function matchesWildcard(version, pattern) {
    let [v1, v2, v3] = parseVersion(version);
    let [p1, p2, p3] = pattern.split('.').map(p => (p === '*' ? '*' : Number(p)));

    return (p1 === '*' || v1 === p1) && (p2 === '*' || v2 === p2) && (p3 === '*' || v3 === p3);
  }

  // Helper function to check if a version matches a range
  function matchesRange(version, range) {
    let operators = ['<', '<=', '>', '>='];
    let operator = operators.find(op => range.match(new RegExp(`^${op}\\d+`)));
    let targetVersion = range.replace(operator, '');
    let compareResult = compareVersions(parseVersion(version), parseVersion(targetVersion));

    switch (operator) {
      case '<':
        return compareResult < 0;
      case '<=':
        return compareResult <= 0;
      case '>':
        return compareResult > 0;
      case '>=':
        return compareResult >= 0;
      default:
        return compareVersions(parseVersion(version), parseVersion(range)) === 0;
    }
  }

  // Check the version against multiple ranges
  for (let range of ranges) {
    if (range.includes('*')) {
      if (matchesWildcard(version, range)) return true;
    } else {
      if (matchesRange(version, range)) return true;
    }
  }

  return false;
}

module.exports = { checkVersion };
