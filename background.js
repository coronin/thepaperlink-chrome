'use strict';

let i; let len; let aKey; let aVal;
let ws; let ws_timer;
let ws_addr = 'node.thepaperlink.com:8081';
let uid = null;
let scholar_count = 0;
let scholar_run = 0;
let scholar_queue = [];
let scholar_no_more = 0;
let scholar_page_open_limits = 3;
let shark_limits = 3;
let loading_theServer = false;
let load_try = 10;
let local_ip = '';
const alldigi = /^\d+$/;
let base = 'https://www.thepaperlink.com';
let guest_apikey = null;
let apikey; let req_key; let pubmeder_apikey; let pubmeder_email; let tpl_ncbi_api;
let ncbi_api;
let local_mirror; let ezproxy_prefix; let cc_address;
let arbitrary_sec = 3;
let pubmeder_ok = false;
let cloud_op = '';
let broadcast_loaded = false;
const extension_load_date = new Date();
const date_str = 'day_' + extension_load_date.getFullYear() +
                 '_' + (extension_load_date.getMonth() + 1) +
                 '_' + extension_load_date.getDate();
let jcr_obj = {};

const connectedPorts = new Map();

console.log('The Paper Link service worker starting...');

function hasThreeCommas(str) {
  return str.split(',').length === 4;
}

function load_JCR () {
  fetch(chrome.runtime.getURL('jcr.csv.json'))
    .then(response => response.json())
    .then(data => {
      jcr_obj = data.above3 || {};
      console.log(data.version, 'JCR data loaded:', Object.keys(jcr_obj).length, 'journals');
    })
    .catch(err => {
      console.log('Failed to load JCR data:', err);
    });
}

function ez_format_link (prefix, url) {
  if (!prefix) {
    return url;
  } else if (prefix.substr(0, 1) === '.') {
    let ss = ''; const s = url.split('/');
    for (i = 0; i < s.length; i += 1) {
      ss += s[i];
      if (i === 2) {
        ss += prefix;
      }
      ss += '/';
    }
    return ss;
  } else {
    return (prefix + url);
  }
}

function get_ymd () {
  const d = new Date();
  return [d.getFullYear(), (d.getMonth() + 1), d.getDate()];
}

function get_yearStr () {
  const d = new Date();
  return '' + d.getFullYear();
}

function get_end_num (str) {
  if (!str) { return 0; }
  try {
    return parseInt(str.substr(str.lastIndexOf(',') + 1), 10);
  } catch (err) {
    console.log('>> get_end_num: ' + err);
    return 0;
  }
}

function post_theServer (v) {
  console.log('post_theServer called (simplified)');
}

function get_theServer_ajax () {
  console.log('get_theServer_ajax not implemented');
}

function broadcast_Listener () {
  console.log('broadcast_Listener not implemented');
}

function syncFromSyncToLocal(callback) {
  chrome.storage.local.get(['thepaperlink_apikey', 'pubmeder_apikey'], function(localItems) {
    if (localItems && (localItems.thepaperlink_apikey || localItems.pubmeder_apikey)) {
      console.log('Merge not ready @@@@');
      if (callback) callback();
      return;
    }
    chrome.storage.sync.get(null, function(syncItems) {
      if (!syncItems || Object.keys(syncItems).length === 0) {
        console.log('No data in storage.sync');
        if (callback) callback();
        return;
      }
      const validItems = {};
      for (let key in syncItems) {
        const val = syncItems[key];
        if (val === null || val === undefined) continue;
        if (typeof val === 'string' && (val === 'undefined' || val === '[object Object]')) continue;
        validItems[key] = val;
      }
      if (Object.keys(validItems).length > 0) {
        chrome.storage.local.set(validItems, function() {
          console.log('Synced from sync to local:', Object.keys(validItems).length, 'items');
          if (callback) callback();
        });
      } else {
        if (callback) callback();
      }
    });
  });
}

function syncToStorageSync() {
  chrome.storage.local.get(null, function(items) {
    if (!items) return;
    const syncValues = {};
    const pmidKeys = [];
    const keywordKeys = [];
    const keysToRemove = [];
    let val;
    for (let key in items) {
      val = items[key];
      if (key.indexOf('tabId:') === 0 ||
          key.indexOf('downloadId_') === 0 ||
          key.indexOf('diff_') === 0 ||
          key.indexOf('day_') === 0 ||
          key.indexOf('email_') === 0 ||
          key.indexOf('shark_') === 0 ||
          key.indexOf('scholar_') === 0 ||
          key.indexOf('abs_') === 0 ||
          key.indexOf('tpl') === 0 ||
          key.indexOf('id_found') === 0 ||
          key.indexOf('id_history') === 0) {
        keysToRemove.push(key);
        continue;
      }
      if (typeof val === 'string') {
        if (hasThreeCommas(val) && val.indexOf('201') === 0 || val.indexOf('202') === 0) {
          keywordKeys.push(key);
          if (keywordKeys.length > 200) { // 2026-2-15
            continue;
          }
        }
        syncValues[key] = val;
      } else if (key.indexOf('pmid_') === 0) {
        pmidKeys.push(key);
        if (pmidKeys.length <= 64) { // 2026-2-14
          syncValues[key] = val;
        }
      }
    }
    if (keysToRemove.length > 0) {
      console.log('Removing from sync:', keysToRemove.length);
      chrome.storage.sync.remove(keysToRemove, function() {
        console.log('Removed storage.sync');
        if (Object.keys(syncValues).length > 0) {
          console.log('Syncing to storage.sync:', Object.keys(syncValues).length, 'items');
          chrome.storage.sync.set(syncValues, function() {
            if (chrome.runtime.lastError) {
              console.log('Sync quota exceeded:', chrome.runtime.lastError.message);
            } else {
              console.log('Synced to storage.sync');
            }
          });
        }
      });
    }
  });
}

let isLoadingState = false;

function loadState(callback) {
  if (isLoadingState) {
    if (callback) callback();
    return;
  }
  isLoadingState = true;
  syncFromSyncToLocal(function() {
    chrome.storage.local.get(null, function(items) {
      if (!items) {
        if (callback) callback();
        return;
      }
      apikey = items.thepaperlink_apikey || items.tpl_apikey || null;
      req_key = apikey;
      pubmeder_apikey = items.pubmeder_apikey || null;
      pubmeder_email = items.pubmeder_email || null;
      tpl_ncbi_api = items.tpl_ncbi_api || null;
      ws_addr = items.websocket_server || 'node.thepaperlink.com:8081';
      uid = items.ip_time_uid || null;
      local_mirror = items.local_mirror || '127.0.0.1';
      ezproxy_prefix = items.ezproxy_prefix || '';
      cc_address = items.cc_address || '';
      arbitrary_sec = parseInt(items.arbitrary_sec) || 3;
      base = (items.rev_proxy === 'yes') ? 'https://www.thepaperlink.cn' : 'https://www.thepaperlink.com';
      pubmeder_ok = !!(pubmeder_apikey && pubmeder_email);
      cloud_op = '';
      if (items.mendeley_status === 'success') cloud_op += 'm';
      if (items.facebook_status === 'success') cloud_op += 'f';
      if (items.dropbox_status === 'success') cloud_op += 'd';
      if (items.douban_status === 'success') cloud_op += 'b';
      if (items.googledrive_status === 'success') cloud_op += 'g';
      if (items.onedrive_status === 'success') cloud_op += 'o';
      if (items.baiduyun_status === 'success') cloud_op += 'y';
      console.log('State loaded:', { apikey: !!apikey, pubmeder_ok: pubmeder_ok, cloud_op: cloud_op });
      isLoadingState = false;
      if (callback) callback();
    });
  });
}

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name !== 'background_port') {
    return;
  }
  console.log('Port connected:', port.sender ? port.sender.url : port.sender);
  const portId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  connectedPorts.set(portId, port);
  port.onMessage.addListener(function(message) {
    handlePortMessage(port, message);
  });
  port.onDisconnect.addListener(function() {
    console.log('Port disconnected:', portId);
    connectedPorts.delete(portId);
  });
});

// Shared helper function for External requests
function doRequest(url, sendResponse) {
  let requestUrl = base + url + (req_key || '') + '&runtime=' + chrome.runtime.id;
  if (uid) {
    requestUrl += '&uid=' + uid;
  }
  if (!apikey) {
    sendResponse({ except: 'Guest usage limited.', tpl: '' });
    return;
  }
  fetch(requestUrl)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      sendResponse({
        r: data,
        tpl: apikey,
        pubmeder: pubmeder_ok,
        cloud_op: cloud_op,
        uri: base,
        p: ezproxy_prefix,
        year: new Date().getFullYear().toString()
      });
    })
    .catch(function(error) {
      // Don't log if it's an HTML response (JSON parse error)
      if (!error.message || !error.message.includes('JSON')) {
        console.error(requestUrl);
        console.log('External request failed:', error);
      }
      sendResponse({ except: 'Server error.', tpl: apikey });
    });
}

// Shared message handler - returns true if async response needed
function handleCommonMessage(message, sendFn) {
  if (message.load_local_mirror) {
    sendFn({
      local_mirror: local_mirror,
      arbitrary_pause: arbitrary_sec * 1000
    });
    return false;
  }
  if (message.url) {
    doRequest(message.url, sendFn);
    return true;
  }
  if (message.save_apikey) {
    const storageUpdate = {};
    if (message.save_email) {
      pubmeder_apikey = message.save_apikey;
      pubmeder_email = message.save_email;
      pubmeder_ok = true;
      storageUpdate.pubmeder_apikey = message.save_apikey;
      storageUpdate.pubmeder_email = message.save_email;
      storageUpdate.b_apikey_gold = 'yes';
    } else {
      apikey = message.save_apikey;
      req_key = message.save_apikey;
      storageUpdate.thepaperlink_apikey = message.save_apikey;
      storageUpdate.a_apikey_gold = 'yes';
    }
    chrome.storage.local.set(storageUpdate, function() {
      sendFn({ success: true });
    });
    return false;
  }
  if (message.load_common_values) {
    loadState(function() {
      sendFn({ loaded: true });
    });
    return false;
  }
  if (message.menu_display) {
    createContextMenus();
    sendFn({ menu_created: true });
    return false;
  }
  if (message.sendID) {
    chrome.storage.local.get('id_found', function(items) {
      const id_found = items.id_found || '';
      if (id_found.indexOf(message.sendID) === -1) {
        const newFound = id_found + ' ' + message.sendID;
        chrome.storage.local.set({ id_found: newFound });
      }
      sendFn({ received: true });
    });
    return false;
  }
  if (message.fetch_JCR) {
    if (jcr_obj[message.fetch_JCR]) {
      sendFn({
        class_JCR: [message.fetch_JCR, jcr_obj[message.fetch_JCR]]
      });
    }
    return false;
  }
  if (message.t_cont) {
    let t_cont = message.t_cont;
    if (t_cont.indexOf('Free article.') > 0) {
      t_cont = t_cont.replace(' Free article.', '');
    }
    if (t_cont.indexOf('Free PMC article.') > 0) {
      t_cont = t_cont.replace(' Free PMC article.', '');
    }
    if (t_cont.indexOf('Review.') > 0) {
      t_cont = t_cont.replace(' Review.', '');
    }
    if (t_cont.indexOf('Online ahead of print.') > 0) {
      t_cont = t_cont.replace(' Online ahead of print.', '');
    }
    sendFn({ t_cont: t_cont, received: true });
    return false;
  }
  if (message.saveIt) {
    sendFn({ received: true });
    return false;
  }
  if (message.a_pmid && message.a_title) {
    return false;
  }
  if (message.reset_gs_counts) {
    return false;
  }
  if (message.pageAbs) {
    const absKey = 'abs_' + message.pmid;
    const absObj = {};
    absObj[absKey] = message.pageAbs;
    chrome.storage.local.set(absObj);
    return false;
  }
  if (message.search_term) {
    return false;
  }
  if (message.failed_term) {
    return false;
  }
  if (message.pmid && (message.pii_link || message.doi_link)) {
    return false;
  }
  if (message.money_emailIt || message.money_reportWrongLink || message.money_needInfo) {
    return false;
  }
  return false;
}

function handlePortMessage(port, message) {
  if (!message.a_pmid && !message.fetch_JCR) console.log('Port message:', message);
  handleCommonMessage(message, function(response) {
    port.postMessage(response);
  });
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.internal) {
    sendResponse({ received: true });
    return;
  }
  if (message.get_state || message.getState) {
    sendResponse({
      apikey: apikey,
      req_key: req_key,
      pubmeder_apikey: pubmeder_apikey,
      pubmeder_email: pubmeder_email,
      pubmeder_ok: pubmeder_ok,
      cloud_op: cloud_op,
      ws_addr: ws_addr,
      uid: uid,
      local_mirror: local_mirror,
      ezproxy_prefix: ezproxy_prefix,
      cc_address: cc_address,
      arbitrary_sec: arbitrary_sec,
      base: base,
      jcr_obj: jcr_obj
    });
    return;
  }
  if (message.ncbi_api) {
    tpl_ncbi_api = message.ncbi_api;
    const ncbiObj = {};
    ncbiObj['tpl_ncbi_api'] = message.ncbi_api;
    chrome.storage.local.set(ncbiObj, function() {
      sendResponse({ success: true });
    });
    return;
  }
  if (message.from_f1000 || message.from_sites_w_pmid || message.from_sites_w_doi) {
    return;
  }
  if (message.do_syncValues) {
    syncToStorageSync();
    return;
  }
  console.log('One-time message:', message);
  return handleCommonMessage(message, sendResponse);
});

function createContextMenus() {
  chrome.contextMenus.removeAll(function() {
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

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  switch (info.menuItemId) {
    case 'search_tpl':
      chrome.tabs.create({ url: base + '/?q=' + info.selectionText });
      break;
    case 'bookmark_tool':
      chrome.tabs.create({ url: base + '/js/' });
      break;
    case 'stored_search':
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
      break;
    case 'options':
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      break;
    case 'authorize':
      chrome.tabs.create({ url: base + '/oauth' });
      break;
  }
});

chrome.runtime.onInstalled.addListener(function() {
  console.log('Extension installed');
  loadState(function() {
    createContextMenus();
  });
});

chrome.runtime.onStartup.addListener(function() {
  console.log('Extension startup');
  loadState();
});

chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker alive, ports:', connectedPorts.size);
  }
});

chrome.idle.setDetectionInterval(60);

chrome.idle.onStateChanged.addListener(function(state) {
  if (state === 'active') {
    if (!apikey) {
      loadState();
    }
  }
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName === 'local') {
    loadState();
  }
});

// Omnibox - Address bar keyword search
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  suggest([
    { content: text + '&pdf_only=on', description: 'only search articles with valid PDF' },
    { content: text + '&reviews_only=on', description: 'only research reviews in PubMed' }
  ]);
});

chrome.omnibox.onInputEntered.addListener(function(text) {
  const newURL = base + '?q=' + text;
  chrome.tabs.create({ url: newURL });
});

load_JCR();
syncToStorageSync();
loadState();

console.log('Service worker initialized');
