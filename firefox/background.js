const DEBUG = false;
const STORAGE_KEY = 'trackerData';
const LOG = '[Dreaming Insights]';
const log = (...args) => DEBUG && console.log(LOG, ...args);
const warn = (...args) => DEBUG && console.warn(LOG, ...args);

// --- Icon rendering ---

function drawIcon(size, type) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (type === 'fresh') {
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${Math.round(size * 0.72)}px Arial`;
    ctx.fillText('✓', size / 2, size * 0.54);
  } else {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${Math.round(size * 0.52)}px Arial`;
    ctx.fillText('¿?', size / 2, size * 0.54);
  }

  return ctx.getImageData(0, 0, size, size);
}

function updateIcon(trackerData) {
  const dayData = trackerData?.dayWatchedTime?.data;
  let type = 'stale';

  if (Array.isArray(dayData) && dayData.length > 0) {
    const maxDateStr = dayData.reduce(
      (max, item) => (item.date > max ? item.date : max),
      dayData[0].date
    );
    const ageMs = Date.now() - new Date(maxDateStr).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) type = 'fresh';
    log(`icon update: most recent date=${maxDateStr}, age=${ageDays.toFixed(1)} days → ${type}`);
  } else {
    log('icon update: no dayWatchedTime data → stale');
  }

  browser.browserAction.setIcon({
    imageData: {
      16: drawIcon(16, type),
      48: drawIcon(48, type),
      128: drawIcon(128, type),
    },
  });
}

// --- Message handling ---

browser.runtime.onMessage.addListener((message) => {
  if (message.type !== 'API_RESPONSE') return;

  const { url, data, timestamp } = message.payload;
  log('background received API_RESPONSE from', url);

  const key = url.includes('watchedVideo')
    ? 'watchedVideo'
    : url.includes('externalTime')
    ? 'externalTime'
    : url.includes('dayWatchedTime')
    ? 'dayWatchedTime'
    : null;

  if (!key) {
    warn('unrecognised URL, ignoring:', url);
    return;
  }

  browser.storage.local.get(STORAGE_KEY).then((result) => {
    const current = result[STORAGE_KEY] || {};
    current[key] = { data, timestamp, url };
    return browser.storage.local.set({ [STORAGE_KEY]: current }).then(() => {
      log(`stored ${key} data`);
      updateIcon(current);
    });
  });
});

// Set icon on startup based on whatever is already stored
browser.runtime.onStartup.addListener(() => {
  browser.storage.local.get(STORAGE_KEY).then((result) => {
    updateIcon(result[STORAGE_KEY]);
  });
});

// Also set it when the event page first loads
browser.storage.local.get(STORAGE_KEY).then((result) => {
  updateIcon(result[STORAGE_KEY]);
});
