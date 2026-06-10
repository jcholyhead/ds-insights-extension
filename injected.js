// Runs in page context (not extension context) — can intercept fetch/XHR
(function () {
  const DEBUG = false;
  const LOG = '[Dreaming Insights]';
  const log = (...args) => DEBUG && console.log(LOG, ...args);

  const TARGETS = [
    '/.netlify/functions/watchedVideo',
    '/.netlify/functions/externalTime',
    '/.netlify/functions/dayWatchedTime',
  ];

  function isTarget(url) {
    return TARGETS.some((t) => {
      if (!url.includes(t)) return false;
      // Ignore the single-day variant which carries a `date` query param
      if (t.includes('dayWatchedTime')) {
        try {
          return !new URL(url).searchParams.has('date');
        } catch {
          return !url.includes('date=');
        }
      }
      return true;
    });
  }

  function relay(url, data) {
    log('captured response from', url, data);
    window.postMessage(
      { source: 'dreaming-tracker', url, data, timestamp: Date.now() },
      '*'
    );
  }

  // --- fetch interception ---
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
        ? args[0].url
        : String(args[0]);

    const response = await originalFetch.apply(this, args);

    if (isTarget(url)) {
      log('target fetch intercepted:', url);
      response
        .clone()
        .json()
        .then((data) => relay(url, data))
        .catch(() =>
          response
            .clone()
            .text()
            .then((text) => relay(url, text))
        );
    }

    return response;
  };

  // --- XHR interception ---
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._trackerUrl = typeof url === 'string' ? url : String(url);
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (isTarget(this._trackerUrl || '')) {
      this.addEventListener('load', function () {
        try {
          relay(this._trackerUrl, JSON.parse(this.responseText));
        } catch {
          relay(this._trackerUrl, this.responseText);
        }
      });
    }
    return originalSend.apply(this, args);
  };
})();
