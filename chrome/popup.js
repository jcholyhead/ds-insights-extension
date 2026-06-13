const ENDPOINTS = ['watchedVideo', 'dayWatchedTime', 'externalTime'];

function formatTimestamp(ms) {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function renderValue(value, depth = 0) {
  if (value === null) return '<span class="null">null</span>';
  if (typeof value === 'boolean') return `<span class="bool">${value}</span>`;
  if (typeof value === 'number') return `<span class="num">${value}</span>`;
  if (typeof value === 'string') return `<span class="str">"${escapeHtml(value)}"</span>`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="punct">[]</span>';
    const items = value
      .map((v) => `<div class="indent">${renderValue(v, depth + 1)}</div>`)
      .join('');
    return `<span class="punct">[</span>${items}<span class="punct">]</span>`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '<span class="punct">{}</span>';
    const rows = entries
      .map(
        ([k, v]) =>
          `<div class="indent"><span class="key">${escapeHtml(k)}:</span> ${renderValue(v, depth + 1)}</div>`
      )
      .join('');
    return `<span class="punct">{</span>${rows}<span class="punct">}</span>`;
  }

  return escapeHtml(String(value));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Keyed by endpoint name, holds the raw data object for copy operations
const rawData = {};

function render(data) {
  for (const key of ENDPOINTS) {
    const entry = data?.[key];
    const bodyEl = document.getElementById(`${key}Body`);
    const timeEl = document.getElementById(`${key}Time`);

    if (!entry) continue;

    rawData[key] = entry.data;
    timeEl.textContent = `captured at ${formatTimestamp(entry.timestamp)}`;
    bodyEl.innerHTML = `<div class="json">${renderValue(entry.data)}</div>`;
  }
}

function load() {
  chrome.storage.local.get('trackerData', (result) => {
    render(result.trackerData || {});
  });
}

document.querySelectorAll('.copyBtn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    const payload = rawData[key];
    if (!payload) return;

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    });
  });
});

document.getElementById('privacyLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://www.dreaminginsights.com/privacy.html' });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.storage.local.remove('trackerData', () => {
    for (const key of ENDPOINTS) {
      document.getElementById(`${key}Body`).innerHTML =
        '<p class="empty">Cleared.</p>';
      document.getElementById(`${key}Time`).textContent = '';
    }
  });
});

// Refresh display whenever storage changes (e.g. a new response arrives while popup is open)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.trackerData) render(changes.trackerData.newValue || {});
});

load();
