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
- Manages context menus and clipboard operations
- Loads JCR impact factor data from `jcr.csv.json` using `fetch()`
- Communicates with content scripts via `chrome.runtime.connect` (port name: `background_port`)
- Uses `chrome.alarms` for keep-alive (service worker can be terminated after ~30s inactivity)
- Key message handlers: `url`, `sendID`, `saveIt`, `fetch_JCR`, `pageAbs`, `search_term`, etc.

**contentscript.js** - Content scripts:
- Injected into matched URLs (PubMed, Google Scholar, bioRxiv, medRxiv, F1000, etc.)
- Parses page DOM to extract PMIDs, authors, and article metadata
- Injects UI elements (PDF links, impact factors, clippy buttons)
- Handles clipboard operations directly using `copyToClipboard()` (MV3 cannot use DOM in background)
- QR code display on hover over "the paper link" text using adjacent sibling selector
- F1000 site processing with null checks for DOM elements

**ess.js / ess.html** - Extension popup:
- Small UI shown when clicking the extension icon
- Handles user interactions for individual articles
- Uses `var` for `_port` (not `let`) to allow redeclaration when loaded with history.js

**history.js / history.html** - History page:
- Displays saved papers and search history
- Uses `chrome.storage.local` directly (not window.localStorage)

**options.js / options.html** - Options page:
- User settings and API key management
- Uses `chrome.storage.local` directly

### Data Flow

1. Content script extracts PMID from page
2. Sends to background via `a_proxy()` → `_port.postMessage()` or `chrome.runtime.sendMessage()`
3. Background calls `www.thepaperlink.com/api` with PMID
4. Background responds with paper metadata (PDF, impact factor, citations)
5. Content script renders enhanced UI elements

### Storage

- `chrome.storage.local` - Primary storage for all extension data (MV3), cached paper data
- `chrome.storage.sync` - User settings synced across installations (limited to 100KB)

**Sync Flow:**
1. **On background.js startup**: `syncFromSyncToLocal()` checks if local is empty, then syncs from sync to local
2. **On background.js startup**: `syncToStorageSync()` syncs from local to sync
3. **On page load (ess/options.js)**: `syncStorageFromChrome()` syncs from sync to local
4. **On history page load**: Uses chrome.storage.local directly, objects with scholar/shark keys handled specially

- `window.localStorage` - Not used in MV3

### External APIs

- `www.thepaperlink.com` - Main API server (also `.cn`, `.net` mirrors)
- `eutils.ncbi.nlm.nih.gov` - NCBI/PubMed API for abstract fetching
- `scholar.google.com` - Citation count scraping
- `api.qrserver.com` - QR code generation for sharing

## MV3 Migration (Key JS Changes)

### background.js (Major Rewrite)
```
MV2: 1545 lines → MV3: 644 lines

Changes:
- Removed localStorage usage, uses chrome.storage.local
- Removed XMLHttpRequest, uses fetch()
- Removed WebSocket code (not implemented in MV3)
- Removed DEBUG constant
- Uses appState object for centralized state management
- Uses chrome.alarms for keep-alive (service worker timeout)
- Uses chrome.runtime.onConnect for port connections
- Uses chrome.runtime.onMessage for one-time messages
- Simplified message handlers (removed complex logic)
- Added syncToStorageSync() to sync settings to chrome.storage.sync
```

### contentscript.js (+200/-XX lines)
```
Changes:
- Added copyToClipboard() using Clipboard API with textarea fallback
- Added QR code HTML generation and CSS (adjacent sibling selector)
- Added null checks for F1000 DOM elements (getElementsByTagName)
- Simplified port disconnect handling
```

### history.js (Major Rewrite)
```
Changes:
- MV3 port connection (lines 3-18): replaces chrome.extension.getBackgroundPage
- Uses chrome.storage.local.get/remove/set instead of localStorage
- Added 'downloadId_' to skip list (line 81)
- Handles objects with scholar/shark keys directly (lines 87-100):
  - Object with 'scholar' key: format_a_li('scholar', pmid, url, count)
  - Object with 'shark' key: format_a_li('shark', pmid, url)
  - Preserves object in syncValues for multi-device sync
- Added check for duplicate scholar: if exists, skip adding new (lines 144-148)
- Commented out scholar limit deletion (lines 149-151)
- Simplified syncValues assignment: directly assign value not ''+val (lines 138, 168)
- Visual feedback: green border on success, red border on nothing to sync (lines 184-190)
```

### ess.js (-52 lines)
```
Changes:
- Changed let _port to var _port (for history.html compatibility)
- Added syncStorageFromChrome() to sync from chrome.storage.sync to chrome.storage.local
```

### options.js (-38 lines)
```
Changes:
- Removed _bkg.localStorage reference
- Added syncStorageFromChrome() to sync from chrome.storage.sync to chrome.storage.local
- Uses chrome.storage.local directly for settings
```

## Key Conventions

- `DEBUG` constant removed from MV3 (always use console.log)
- `a_proxy()` function in content scripts sends messages to background
- `copyToClipboard()` in contentscript.js for clipboard operations
- PMIDs extracted via regex patterns like `/pmid\s*:?\s*(\d+)/i`
- QR code: `.thepaperlink-home:hover + .thepaperlink-qr` shows on hover (adjacent sibling)
- F1000 processing: Always check for null before accessing DOM elements

## Message Handlers

### content script → background
- `url` - API request
- `sendID` - PubMed ID
- `saveIt` - Save paper
- `fetch_JCR` - Get impact factor
- `pageAbs` - Save abstract
- `search_term` - Search term
- `a_pmid`, `a_title` - Google Scholar
- `from_f1000` - F1000 data

### background → content script
- `r`, `tpl`, `pubmeder`, `cloud_op` - API response
- `class_JCR` - Impact factor data
- `local_mirror`, `arbitrary_pause` - Settings
