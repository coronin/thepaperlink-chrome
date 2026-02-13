'use strict';

// Manifest V3 Service Worker - Optimized
// Best practices for MV3 service worker implementation

console.log('The Paper Link service worker starting...');

// =====================
// 1. STATE MANAGEMENT
// =====================
let appState = {
  apikey: null,
  req_key: null,
  pubmeder_apikey: null,
  pubmeder_email: null,
  pubmeder_ok: false,
  cloud_op: '',
  ws_addr: 'node.thepaperlink.com:8081',
  uid: null,
  local_mirror: '127.0.0.1',
  ezproxy_prefix: '',
  cc_address: '',
  arbitrary_sec: 3,
  base: 'https://www.thepaperlink.com',
  jcr_obj: {}
};

// =====================
// 2. PORT MANAGEMENT
// =====================
const connectedPorts = new Map();

// =====================
// 2.1 JCR DATA LOADING
// =====================
function loadJCR() {
  console.time('>> load JCR data');
  fetch(chrome.runtime.getURL('jcr.csv.json'))
    .then(response => response.json())
    .then(data => {
      appState.jcr_obj = data.above5 || {};
      console.log('JCR data loaded:', Object.keys(appState.jcr_obj).length, 'journals');
      console.timeEnd('>> load JCR data');
    })
    .catch(err => {
      console.log('Failed to load JCR data:', err);
      console.timeEnd('>> load JCR data');
    });
}

// Load JCR data on startup
loadJCR();

// =====================
// 3. STATE LOADING (async)
// =====================
function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      if (!items) {
        resolve();
        return;
      }

      // Load all state values
      appState.apikey = items.thepaperlink_apikey || items.tpl_apikey || null;
      appState.pubmeder_apikey = items.pubmeder_apikey || null;
      appState.pubmeder_email = items.pubmeder_email || null;
      appState.ws_addr = items.websocket_server || 'node.thepaperlink.com:8081';
      appState.uid = items.ip_time_uid || null;
      appState.local_mirror = items.local_mirror || '127.0.0.1';
      appState.ezproxy_prefix = items.ezproxy_prefix || '';
      appState.cc_address = items.cc_address || '';
      appState.arbitrary_sec = parseInt(items.arbitrary_sec) || 3;
      appState.base = (items.rev_proxy === 'yes') ? 'https://www.thepaperlink.cn' : 'https://www.thepaperlink.com';

      // Derived state
      appState.pubmeder_ok = !!(appState.pubmeder_apikey && appState.pubmeder_email);
      appState.req_key = appState.apikey;

      // Build cloud_op
      appState.cloud_op = '';
      if (items.mendeley_status === 'success') appState.cloud_op += 'm';
      if (items.facebook_status === 'success') appState.cloud_op += 'f';
      if (items.dropbox_status === 'success') appState.cloud_op += 'd';
      if (items.douban_status === 'success') appState.cloud_op += 'b';
      if (items.googledrive_status === 'success') appState.cloud_op += 'g';
      if (items.onedrive_status === 'success') appState.cloud_op += 'o';
      if (items.baiduyun_status === 'success') appState.cloud_op += 'y';

      console.log('State loaded:', appState);
      resolve();
    });
  });
}

// =====================
// 4. PORT CONNECTION HANDLER
// =====================
chrome.runtime.onConnect.addListener((port) => {
  // Validate port name
  if (port.name !== 'background_port') {
    return;
  }

  console.log('Port connected:', port.sender?.url || port.sender?.tab?.id);

  // Generate unique port ID
  const portId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  connectedPorts.set(portId, port);

  // Handle messages from this port
  const messageListener = (message) => {
    handlePortMessage(port, message);
  };
  port.onMessage.addListener(messageListener);

  // Handle disconnect
  const disconnectListener = () => {
    console.log('Port disconnected:', portId);
    port.onMessage.removeListener(messageListener);
    port.onDisconnect.removeListener(disconnectListener);
    connectedPorts.delete(portId);
  };
  port.onDisconnect.addListener(disconnectListener);
});

// =====================
// 5. MESSAGE HANDLER
// =====================
function handlePortMessage(port, message) {
  console.log('Port message:', message);

  // Handle load_local_mirror
  if (message.load_local_mirror) {
    port.postMessage({
      local_mirror: appState.local_mirror,
      arbitrary_pause: appState.arbitrary_sec * 1000
    });
    return;
  }

  // Handle URL request (API call)
  if (message.url) {
    handleApiRequest(port, message.url);
    return;
  }

  // Handle save_apikey
  if (message.save_apikey) {
    handleSaveApikey(port, message.save_apikey, message.save_email);
    return;
  }

  // Handle load_common_values
  if (message.load_common_values) {
    loadState().then(() => {
      port.postMessage({ loaded: true });
    });
    return;
  }

  // Handle menu_display
  if (message.menu_display) {
    createContextMenus();
    port.postMessage({ menu_created: true });
    return;
  }

  // Handle sendID
  if (message.sendID) {
    handleSendID(port, message.sendID);
    return;
  }

  // Handle fetch_JCR (2024-4-2)
  if (message.fetch_JCR) {
    if (message.fetch_JCR && appState.jcr_obj[message.fetch_JCR]) {
      port.postMessage({
        class_JCR: [message.fetch_JCR, appState.jcr_obj[message.fetch_JCR]]
      });
    }
    return;
  }

  // Handle t_cont (clipboard) - forward to content script for MV3
  if (message.t_cont) {
    port.postMessage({ t_cont: message.t_cont, received: true });
    return;
  }

  // Handle saveIt
  if (message.saveIt) {
    handleSaveIt(port, message.saveIt);
    return;
  }

  // Handle other messages
  port.postMessage({ received: true });
}

// API Request Handler
function handleApiRequest(port, url) {
  const request_url = appState.base + url +
    (appState.req_key || '') +
    '&runtime=' + chrome.runtime.id;

  if (appState.uid) {
    request_url += '&uid=' + appState.uid;
  }

  if (!appState.apikey) {
    port.postMessage({ except: 'Guest usage limited.', tpl: '' });
    return;
  }

  fetch(request_url)
    .then(response => response.json())
    .then(data => {
      port.postMessage({
        r: data,
        tpl: appState.apikey,
        pubmeder: appState.pubmeder_ok,
        cloud_op: appState.cloud_op,
        uri: appState.base,
        p: appState.ezproxy_prefix,
        year: new Date().getFullYear().toString()
      });
    })
    .catch(error => {
      console.error('API request failed:', error);
      port.postMessage({ except: 'Network error.', tpl: appState.apikey });
    });
}

// Save API Key Handler
function handleSaveApikey(port, apikey, email) {
  const storageUpdate = {};

  if (email) {
    appState.pubmeder_apikey = apikey;
    appState.pubmeder_email = email;
    appState.pubmeder_ok = true;
    storageUpdate.pubmeder_apikey = apikey;
    storageUpdate.pubmeder_email = email;
    storageUpdate.b_apikey_gold = 'yes';
  } else {
    appState.apikey = apikey;
    appState.req_key = apikey;
    storageUpdate.thepaperlink_apikey = apikey;
    storageUpdate.a_apikey_gold = 'yes';
  }

  chrome.storage.local.set(storageUpdate, () => {
    port.postMessage({ success: true });
  });
}

// SendID Handler
function handleSendID(port, sendID) {
  chrome.storage.local.get('id_found', (items) => {
    const id_found = items.id_found || '';
    if (id_found.indexOf(sendID) === -1) {
      const newFound = id_found + ' ' + sendID;
      chrome.storage.local.set({ id_found: newFound });
    }
    port.postMessage({ received: true });
  });
}

// SaveIt Handler
function handleSaveIt(port, pmid) {
  // Simplified implementation - full implementation would save to server
  port.postMessage({ received: true });
}

// =====================
// 6. ONE-TIME MESSAGE HANDLER
// =====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Prevent error logging for internal messages
  if (message.internal) {
    sendResponse({ received: true });
    return;
  }

  console.log('One-time message:', message);

  // Handle load_local_mirror
  if (message.load_local_mirror) {
    sendResponse({
      local_mirror: appState.local_mirror,
      arbitrary_pause: appState.arbitrary_sec * 1000
    });
    return;
  }

  // Handle get state
  if (message.get_state || message.getState) {
    sendResponse(appState);
    return;
  }

  // Handle load_common_values
  if (message.load_common_values) {
    loadState().then(() => sendResponse({ loaded: true }));
    return true; // async
  }

  // Handle menu_display
  if (message.menu_display) {
    createContextMenus();
    sendResponse({ menu_created: true });
    return;
  }

  // Handle save_apikey
  if (message.save_apikey) {
    handleSaveApikeyMessage(message.save_apikey, message.save_email)
      .then(() => sendResponse({ success: true }));
    return true;
  }

  // Handle ncbi_api
  if (message.ncbi_api) {
    chrome.storage.local.set({ 'tpl_ncbi_api': message.ncbi_api }, () => {
      sendResponse({ success: true });
    });
    return;
  }

  // Handle fetch_JCR (2024-4-2)
  if (message.fetch_JCR) {
    if (message.fetch_JCR && appState.jcr_obj[message.fetch_JCR]) {
      sendResponse({
        class_JCR: [message.fetch_JCR, appState.jcr_obj[message.fetch_JCR]]
      });
    }
    return;
  }

  // Handle URL request
  if (message.url) {
    handleApiRequestMessage(message.url)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ except: error.message }));
    return true; // async
  }

  // Default
  sendResponse({ received: true });
});

async function handleSaveApikeyMessage(apikey, email) {
  const storageUpdate = {};

  if (email) {
    appState.pubmeder_apikey = apikey;
    appState.pubmeder_email = email;
    appState.pubmeder_ok = true;
    storageUpdate.pubmeder_apikey = apikey;
    storageUpdate.pubmeder_email = email;
    storageUpdate.b_apikey_gold = 'yes';
  } else {
    appState.apikey = apikey;
    appState.req_key = apikey;
    storageUpdate.thepaperlink_apikey = apikey;
    storageUpdate.a_apikey_gold = 'yes';
  }

  return new Promise((resolve) => {
    chrome.storage.local.set(storageUpdate, resolve);
  });
}

async function handleApiRequestMessage(url) {
  const request_url = appState.base + url +
    (appState.req_key || '') +
    '&runtime=' + chrome.runtime.id;

  if (!appState.apikey) {
    return { except: 'Guest usage limited.', tpl: '' };
  }

  try {
    const response = await fetch(request_url);
    const data = await response.json();
    return {
      r: data,
      tpl: appState.apikey,
      pubmeder: appState.pubmeder_ok,
      cloud_op: appState.cloud_op,
      uri: appState.base,
      p: appState.ezproxy_prefix,
      year: new Date().getFullYear().toString()
    };
  } catch (error) {
    return { except: 'Network error.', tpl: appState.apikey };
  }
}

// =====================
// 7. CONTEXT MENUS
// =====================
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Create menu items
    chrome.contextMenus.create({
      id: 'search_tpl',
      title: "Search the paper link for '%s'",
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'bookmark_tool',
      title: 'Bookmark tool',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'stored_search',
      title: 'Stored search',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'options',
      title: 'Extension Options',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'authorize',
      title: 'Authorize connections',
      contexts: ['page']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'search_tpl':
      chrome.tabs.create({ url: appState.base + '/?q=' + info.selectionText });
      break;
    case 'bookmark_tool':
      chrome.tabs.create({ url: appState.base + '/js/' });
      break;
    case 'stored_search':
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
      break;
    case 'options':
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      break;
    case 'authorize':
      chrome.tabs.create({ url: appState.base + '/oauth' });
      break;
  }
});

// =====================
// 8. LIFECYCLE MANAGEMENT
// =====================

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  loadState().then(() => {
    createContextMenus();
  });
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
  loadState();
});

// Keep-alive using alarms (recommended by Google)
// Service worker can be terminated after ~30 seconds of inactivity
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 }); // Every 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Log for debugging (lightweight operation)
    console.log('Service worker alive, ports:', connectedPorts.size);
  }
});

// Also handle idle state to restart service worker
chrome.idle.setDetectionInterval(60); // Check every minute

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'active') {
    // Browser became active, ensure we're initialized
    if (!appState.apikey) {
      loadState();
    }
  }
});

// =====================
// 9. STORAGE CHANGE LISTENER
// =====================
chrome.storage.onChanged.addListener((changes, areaName) => {
  // Reload state when storage changes
  if (areaName === 'local') {
    loadState();
  }
});

console.log('Service worker initialized');
