# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V2) called "the paper link" that enhances PubMed and other academic sites with:
- Direct PDF links and full-text access
- Journal Impact Factor display
- Google Scholar citation counts
- Faculty 1000 recommendations
- Author "Peaks" functionality for discovering related papers
- Reference clipboard copying in RIS format

## Commands

There is no build system. To test changes:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Changes require reloading the extension

## Architecture

### Core Components

**background.js** - Background page (persistent):
- Handles all API communication with `www.thepaperlink.com`
- Manages WebSocket connection for real-time updates
- Processes PubMed IDs, DOIs, and coordinates data fetching
- Manages context menus and clipboard operations
- Communicates with content scripts via `chrome.runtime.connect` (port name: `background_port`)
- Key message handlers: `url`, `sendID`, `a_pmid`, `a_title`, `saveIt`, `from_f1000`

**contentscript.js** - Content scripts:
- Injected into matched URLs (PubMed, Google Scholar, bioRxiv, medRxiv, F1000, etc.)
- Parses page DOM to extract PMIDs, authors, and article metadata
- Injects UI elements (PDF links, impact factors, clippy buttons)
- Sends extracted data to background page and renders responses
- Contains page-specific processors: `process_pubmed*`, `process_googlescholar`, `process_bioRxiv`, `process_f1000`

**ess.js / ess.html** - Extension popup:
- Small UI shown when clicking the extension icon
- Handles user interactions for individual articles

### Data Flow

1. Content script extracts PMID from page
2. Sends to background via `a_proxy()` → `_port.postMessage()`
3. Background calls `www.thepaperlink.com/api` with PMID
4. Background responds with paper metadata (PDF, impact factor, citations)
5. Content script renders enhanced UI elements

### Storage

- `chrome.storage.local` - Cached paper data keyed by `tpl{PMID}`
- `chrome.storage.sync` - User settings synced across installations
- `localStorage` - Extension preferences, API keys, daily tracking

### External APIs

- `www.thepaperlink.com` - Main API server (also `.cn`, `.net` mirrors)
- `node.thepaperlink.com:8081` - WebSocket server for real-time updates
- `eutils.ncbi.nlm.nih.gov` - NCBI/PubMed API for abstract fetching
- `scholar.google.com` - Citation count scraping

## Key Conventions

- `DEBUG` constant at top of each JS file toggles console logging
- `a_proxy()` function in content scripts sends messages to background
- `b_proxy()` function in background sends messages to content scripts
- PMIDs extracted via regex patterns like `/pmid\s*:?\s*(\d+)/i`
- `arbitrary_pause` variable controls polling intervals (default 3000ms)
