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

  get isTopUrl() {
    const urlInstance = new URL(this.currentUrl);
    return ['/', '/svn'].includes(urlInstance.pathname);
  }
}

module.exports = { UrlHelper };
