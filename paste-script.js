const FIELD_MAP = {
  'watched-input': 'watchedVideo',
  'daytime-input': 'dayWatchedTime',
  'external-input': 'externalTime',
};

function buildPayload(inputId, entry) {
  if (inputId === 'watched-input') {
    const language = new URL(entry.url, 'https://app.dreaming.com').searchParams.get('language') || 'es';
    const inner = Array.isArray(entry.data)
      ? { watchedVideos: entry.data }
      : entry.data;
    return { language, ...inner };
  }
  return entry.data;
}

function fill(trackerData) {
  if (!trackerData) return;

  for (const [inputId, storageKey] of Object.entries(FIELD_MAP)) {
    const entry = trackerData[storageKey];
    const el = document.getElementById(inputId);
    if (!entry || !el) continue;

    const json = JSON.stringify(buildPayload(inputId, entry), null, 2);
    el.value = json;
    // Dispatch input + change so React/Vue/Svelte pick up the new value
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function load() {
  chrome.storage.local.get('trackerData', (result) => {
    fill(result.trackerData);
  });
}

// Fill on page load, then re-fill whenever new data is captured
load();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.trackerData) fill(changes.trackerData.newValue);
});

// SPA safety: if the inputs aren't in the DOM yet, watch for them
const pending = new Set(Object.keys(FIELD_MAP));
if ([...pending].some((id) => !document.getElementById(id))) {
  const observer = new MutationObserver(() => {
    for (const id of [...pending]) {
      if (document.getElementById(id)) pending.delete(id);
    }
    if (pending.size === 0) {
      observer.disconnect();
      load();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
