// Runs on localhost:5174 at document_start.
// Sets the attribute before any JS runs, then fires the custom event after DOMContentLoaded
// so both the synchronous React check and the async fallback work correctly.

const DEBUG = false;
const LOG = '[Dreaming Insights]';
const log = (...args) => DEBUG && console.log(LOG, ...args);

document.documentElement.dataset.dreamingInsights = 'true';
log('detection attribute set on', location.href);

document.addEventListener('DOMContentLoaded', () => {
  log('DOMContentLoaded — dispatching dreaming-insights-ready');
  document.dispatchEvent(
    new CustomEvent('dreaming-insights-ready', { detail: { installed: true } })
  );
});
