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
    return new URL(this.currentUrl).pathname === '/';
  }
}

module.exports = { UrlHelper };
