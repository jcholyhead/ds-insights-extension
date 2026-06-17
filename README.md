# Dreaming Insights Extension

A Chrome extension that captures learning progress data from **app.dreaming.com** and makes it available within the extension popup and on **dreaminginsights.com**.

---

## Overview

When a user visits their progress page on app.dreaming.com, the extension intercepts three API responses that the page fetches as part of its normal operation. The most recent response from each endpoint is stored locally in the browser and can be:

- Viewed in the extension popup in a formatted, readable layout
- Copied to the clipboard from the popup
- Automatically populated into data fields on dreaminginsights.com

No data is sent to any external server. All storage is local to the user's browser.

---

## Features

- Captures responses from `watchedVideo`, `externalTime`, and `dayWatchedTime` endpoints
- Displays captured data in a formatted popup panel with copy-to-clipboard buttons
- Auto-fills corresponding fields on dreaminginsights.com when data is available
- Signals its presence to dreaminginsights.com so the site can prompt users to install it if it isn't detected
- Extension icon indicates data freshness: green checkmark (✓) when data is current, amber question marks (¿?) when data is absent or more than 7 days old
- All data is stored locally using `chrome.storage.local` and can be cleared at any time

---

## Permissions

### `storage`
Used to persist the most recent API response from each endpoint in `chrome.storage.local`. This allows data to survive popup close/reopen and be available to the dreaminginsights.com content script.

### Host permission — `https://app.dreaming.com/*`
Required to inject a content script (`content-script.js`) into the user's progress page. This script injects a page-level interceptor (`injected.js`) that wraps the page's `fetch` and `XMLHttpRequest` APIs to observe responses from the three target endpoints. The interceptor only relays responses from the specific target URLs; all other network traffic is ignored.

### Host permission — `https://dreaminginsights.com/*` and `https://www.dreaminginsights.com/*`
Required to inject two content scripts into dreaminginsights.com:
- `detect-script.js` — sets a DOM attribute (`data-dreaming-insights="true"`) and fires a custom event (`dreaming-insights-ready`) so the site can detect the extension is present and avoid showing an install prompt.
- `paste-script.js` — reads data from `chrome.storage.local` and populates specific input fields on the page with the captured JSON data.

---

## How it works — technical summary

```
app.dreaming.com/spanish/progress
        │
        │  content-script.js (injected at document_start)
        │    └─ injects injected.js into page context
        │         └─ wraps window.fetch / XMLHttpRequest
        │              └─ on target URL response → window.postMessage
        │
        │  content-script.js receives postMessage
        │    └─ chrome.runtime.sendMessage → background.js
        │
background.js (service worker)
        │  stores response in chrome.storage.local
        │  updates extension icon based on data freshness
        │
dreaminginsights.com
        │  detect-script.js (document_start)
        │    └─ sets document.documentElement.dataset.dreamingInsights = 'true'
        │    └─ fires 'dreaming-insights-ready' CustomEvent on DOMContentLoaded
        │
        │  paste-script.js (document_idle)
        │    └─ reads chrome.storage.local
        │    └─ populates #watched-input, #daytime-input, #external-input
        │    └─ dispatches input/change events for framework compatibility
        │    └─ re-fills fields live if new data arrives while page is open
```

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `background.js` | Service worker — receives messages, stores data, updates icon |
| `content-script.js` | Injected into app.dreaming.com/spanish/progress — loads interceptor and relays messages |
| `injected.js` | Runs in page context — wraps fetch/XHR to capture target API responses |
| `detect-script.js` | Injected into dreaminginsights.com at document_start — signals extension presence |
| `paste-script.js` | Injected into dreaminginsights.com at document_idle — fills input fields from storage |
| `popup.html` | Extension popup markup |
| `popup.js` | Popup logic — reads storage, renders data, handles copy and clear |
| `styles.css` | Popup styles |
| `privacy.html` | Privacy policy (opens in new tab from popup footer link) |

---

## Installation (development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle, top right)
4. Click **Load unpacked** and select the `chrome/` directory
5. The extension icon will appear in the toolbar

---

## Usage

1. Navigate to `https://app.dreaming.com/spanish/progress` while logged in
2. The page will make its usual API calls; the extension captures the responses automatically
3. Click the extension icon to view captured data in the popup
4. Visit `https://dreaminginsights.com` — the data fields will be populated automatically

---

## Chrome Web Store reviewer notes

### Testing the extension

To verify the extension functions as described:

1. Load the extension unpacked via `chrome://extensions`
2. Navigate to `https://app.dreaming.com/spanish/progress` (a valid account login is required)
3. Open the extension popup — the three data cards should populate within a few seconds of the page loading
4. The extension icon should change from **¿?** (amber) to **✓** (green) once `dayWatchedTime` data with a recent date is captured
5. Navigate to `https://dreaminginsights.com` — the input fields (`#watched-input`, `#daytime-input`, `#external-input`) should be auto-filled with the captured JSON

### Verifying no external data transmission

All network activity can be verified in the Chrome DevTools **Network** tab. The extension does not initiate any outbound requests. The only storage used is `chrome.storage.local`, which can be inspected at `chrome://extensions` → the extension's **Service worker** → DevTools → **Application** → **Extension Storage**.

### Justification for broad host permission on app.dreaming.com

The permission `https://app.dreaming.com/*` is scoped to a single domain. A narrower path match (e.g. `/spanish/progress`) cannot be used in `host_permissions` in Manifest V3 — path restrictions are only available in `content_scripts.matches`, which is already narrowed to `/spanish/progress*`. The broader host permission is therefore the minimum required by the platform.

---

## Privacy

All data processed by this extension remains on the user's device. See [privacy.html](privacy.html) for the full privacy policy, also accessible via the link in the extension popup.
