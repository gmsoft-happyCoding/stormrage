class RegExpUtils {
  static escape(text) {
    return text.replace(/([-[\]{}()*+?.,\\^$|#\s])/g, '\\$1');
  }
}

module.exports = {
  RegExpUtils,
};
