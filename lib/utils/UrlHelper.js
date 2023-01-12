const path = require('path');

class UrlHelper {
  constructor(targetUrl) {
    this.currentUrl = this.originalUrl = targetUrl;
  }

  prev() {
    const cUrl = new URL(this.currentUrl);
    if (cUrl.pathname === '/') {
      return;
    }
    cUrl.pathname = cUrl.pathname.replace(/\/[^\/]*$/, '');
    this.currentUrl = cUrl.toString();
    return this;
  }

  join(...paths) {
    this.currentUrl = path.join(this.currentUrl, ...paths);
    return this;
  }

  get isTopUrl() {
    const urlInstance = new URL(this.currentUrl);
    return ['/', '/svn'].includes(urlInstance.pathname);
  }
}

module.exports = { UrlHelper };
