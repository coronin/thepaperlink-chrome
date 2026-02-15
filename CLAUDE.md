# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) called "the paper link" that enhances PubMed and academic sites with PDF links, impact factors, citation counts, Faculty Opinions, and author "Peaks" functionality.

## Commands

No build system. To test changes:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

## Core Components

| File | Description |
|------|-------------|
| background.js | MV3 service worker, API communication, context menus, JCR data |
| contentscript.js | DOM parsing, UI injection, clipboard, QR code |
| ess.js/ess.html | Extension popup |
| history.js/history.html | Saved papers and search history |
| options.js/options.html | User settings and API key management |

## Storage (MV3)

- `chrome.storage.local` - Primary storage (~5MB quota)
- `chrome.storage.sync` - Cross-device sync (100KB, 512 items max)

**Sync Flow:**
1. **background.js startup**: `syncFromSyncToLocal()` syncs sync→local if empty, then `syncToStorageSync()` syncs local→sync
2. **options.js**: `syncFromLocalStorage()` syncs MV2 localStorage to chrome.storage
3. **ess/options/history.js**: `syncStorageFromChrome()` syncs sync→local on page load

**Sync Limits (chrome.storage.sync):**
- Skip: `tabId:`, `diff_`, `day_`, `email_`, `shark_`, `scholar_`, `abs_`, `tpl`, `id_found`, `id_history`, `downloadId_`
- Keep latest 64 `pmid_` keys
- Keep latest 200 keywords

## Message Handlers

### Shared Functions
- `doApiRequest(url, sendResponse)` - Shared API request helper
- `handleCommonMessage(message, sendFn)` - Unified handler for port and message

### content script → background
- `url` - API request (uses `doApiRequest()`)
- `sendID`, `saveIt`, `fetch_JCR`, `pageAbs`, `search_term`, `a_pmid`, `a_title`, `from_f1000`

### background → content script
- `r`, `tpl`, `pubmeder`, `cloud_op` - API response
- `class_JCR` - Impact factor
- `local_mirror`, `arbitrary_pause` - Settings

## MV3 Features

- **Omnibox**: keyword `tpl` for address bar search
- **Service Worker**: keep-alive via `chrome.alarms` (every 30s)
- **Context Menus**: via `createContextMenus()`

## Key Conventions

- `_port` uses `var` not `let` (history.html loads multiple scripts)
- Use `chrome.storage.local` in all MV3 files, not `window.localStorage`
- Use `copyToClipboard()` in contentscript.js for clipboard (MV3)
- F1000 processing: always check for null before DOM access
- QR code: `.thepaperlink-home:hover + .thepaperlink-qr` shows on hover
