# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) called "the paper link" that enhances PubMed and other academic sites with:
- Direct PDF links and full-text access
- Journal Impact Factor display
- Google Scholar citation counts
- Faculty 1000 recommendations
- Author "Peaks" functionality for discovering related papers
- Reference clipboard copying in RIS format
- QR code sharing on desktop browsers

## Commands

There is no build system. To test changes:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Changes require reloading the extension

## Architecture

### Core Components

**background.js** - Background Service Worker (MV3):
- Handles all API communication with `www.thepaperlink.com`
- Manages WebSocket connection for real-time updates (not implemented in MV3)
- Processes PubMed IDs, DOIs, and coordinates data fetching
- Manages context menus and clipboard operations
- Loads and serves JCR impact factor data from `jcr.csv.json`
- Communicates with content scripts via `chrome.runtime.connect` (port name: `background_port`)
- Uses `chrome.alarms` for keep-alive (service worker can be terminated after ~30s inactivity)
- Key message handlers: `url`, `sendID`, `a_pmid`, `a_title`, `saveIt`, `from_f1000`, `fetch_JCR`

**contentscript.js** - Content scripts:
- Injected into matched URLs (PubMed, Google Scholar, bioRxiv, medRxiv, F1000, etc.)
- Parses page DOM to extract PMIDs, authors, and article metadata
- Injects UI elements (PDF links, impact factors, clippy buttons)
- Sends extracted data to background page and renders responses
- Contains page-specific processors: `process_pubmed*`, `process_googlescholar`, `process_bioRxiv`, `process_f1000`
- Handles clipboard operations directly (MV3 cannot use DOM in background)
- QR code display on hover over "the paper link" text

**ess.js / ess.html** - Extension popup:
- Small UI shown when clicking the extension icon
- Handles user interactions for individual articles
- Syncs data from `chrome.storage.local` to `window.localStorage` on load

**history.js / history.html** - History page:
- Displays saved papers and search history
- Syncs data from `chrome.storage.local` to `window.localStorage` on load

**options.js / options.html** - Options page:
- User settings and API key management
- Syncs data from `chrome.storage.local` to `window.localStorage` on load

### Data Flow

1. Content script extracts PMID from page
2. Sends to background via `a_proxy()` → `_port.postMessage()` or `chrome.runtime.sendMessage()`
3. Background calls `www.thepaperlink.com/api` with PMID
4. Background responds with paper metadata (PDF, impact factor, citations)
5. Content script renders enhanced UI elements

### Storage

- `chrome.storage.local` - Cached paper data keyed by `tpl{PMID}`, user settings
- `chrome.storage.sync` - User settings synced across installations (limited to 100KB)
- `window.localStorage` - Available in popup/options/history pages (not background)
- **MV3 Note**: Use `syncStorageFromChrome()` in popup/options pages to sync chrome.storage.local to window.localStorage

### External APIs

- `www.thepaperlink.com` - Main API server (also `.cn`, `.net` mirrors)
- `node.thepaperlink.com:8081` - WebSocket server for real-time updates (not implemented in MV3)
- `eutils.ncbi.nlm.nih.gov` - NCBI/PubMed API for abstract fetching
- `scholar.google.com` - Citation count scraping
- `api.qrserver.com` - QR code generation for sharing

## MV3 Migration Notes

### Key Changes from MV2

1. **background.js**: Rewritten as service worker (no persistent background page)
   - Uses `chrome.runtime.onConnect` for port connections
   - Uses `chrome.runtime.onMessage` for one-time messages
   - Uses `chrome.alarms` for keep-alive
   - Uses `fetch()` instead of XMLHttpRequest

2. **Storage**: Background cannot access DOM/localStorage
   - Use `chrome.storage.local` for all storage
   - Add `syncStorageFromChrome()` in popup/options pages

3. **Clipboard**: Cannot use `document.execCommand('Copy')` in background
   - Implement clipboard in content script using Clipboard API or hidden textarea
   - Use `copyToClipboard()` function in contentscript.js

4. **Port Communication**: Service worker may be terminated
   - Implement reconnection logic with `setTimeout`
   - Use `chrome.alarms` to keep service worker alive

5. **JCR Data**: Loaded at startup
   - Use `fetch(chrome.runtime.getURL('jcr.csv.json'))` to load
   - Serve to content scripts via `fetch_JCR` message handler

## Key Conventions

- `DEBUG` constant at top of each JS file toggles console logging
- `a_proxy()` function in content scripts sends messages to background
- `sendToBackground()` helper function with reconnection logic
- PMIDs extracted via regex patterns like `/pmid\s*:?\s*(\d+)/i`
- `arbitrary_pause` variable controls polling intervals (default 3000ms)
- QR code: `.thepaperlink-home:hover .thepaperlink-qr` shows on hover
