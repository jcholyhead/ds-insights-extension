const DEBUG = false;
const LOG = '[Dreaming Insights]';
const log = (...args) => DEBUG && console.log(LOG, ...args);
const warn = (...args) => DEBUG && console.warn(LOG, ...args);

log('API interceptor content-script initialised on', location.href);

// Inject the page-level script so it runs in the page's JS context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => {
  log('injected.js loaded and running in page context');
  script.remove();
};
script.onerror = () => DEBUG && console.error(LOG, 'failed to load injected.js — check web_accessible_resources in manifest');
(document.head || document.documentElement).appendChild(script);

// Relay intercepted API responses to the background service worker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'dreaming-tracker') return;

  log('relaying API response to background →', event.data.url);

  try {
    chrome.runtime.sendMessage({ type: 'API_RESPONSE', payload: event.data });
  } catch {
    warn('extension context invalidated — reload the page to reconnect');
  }
});
