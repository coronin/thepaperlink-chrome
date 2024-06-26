'use strict';

const DEBUG = false;
let i; let len; let aKey; let aVal;
let ws; let ws_timer;
let ws_addr = localStorage.getItem('websocket_server') || 'node.thepaperlink.com:8081';
let uid = localStorage.getItem('ip_time_uid') || null;
let scholar_count = 0;
let scholar_run = 0;
let scholar_queue = [];
let scholar_no_more = 0;
let scholar_page_open_limits = 3;
let shark_limits = localStorage.getItem('shark_limit') || 3;
let loading_theServer = false;
let load_try = 10;
let local_ip = '';
const alldigi = /^\d+$/;
const dd = document;
let base = 'https://www.thepaperlink.com';
let guest_apikey = null;
let apikey; let req_key; let pubmeder_apikey; let pubmeder_email;
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

function load_JCR () {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', chrome.runtime.getURL('jcr.csv.json'), true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      jcr_obj = JSON.parse(xhr.responseText)['above5'];
      DEBUG && console.log(jcr_obj);
      console.timeEnd('>> load common values');
    }
  };
  xhr.send(null);
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
    DEBUG && console.log('>> get_end_num: ' + err);
    return 0;
  }
}

function post_theServer (v) {
  console.time('Call theServer for values');
  const a = ['WEBSOCKET_SERVER', 'GUEST_APIKEY'];
  const version = 'Chrome_v2.9';
  if (!local_ip) {
    return;
  }
  $.post('https://www.thepaperlink.com/',
    { pmid: '1', title: a[v], ip: local_ip, a: version },
    function (d) {
      DEBUG && console.log('>> post_theServer, ' + a[v]);
      DEBUG && console.log(d);
      if (d) {
        if (d.websocket_server) {
          localStorage.setItem('websocket_server', d.websocket_server);
          if (v === 0 && d.websocket_server !== ws_addr) {
            ws_addr = d.websocket_server;
            if (ws) {
              ws.close();
              broadcast_loaded = false;
            }
            DEBUG && console.log('>> connect to the new ws server');
            load_broadcast();
          }
        }
        if (d.guest_apikey) {
          guest_apikey = d.guest_apikey;
          localStorage.setItem('GUEST_APIKEY', guest_apikey);
        } else if (v !== 1 && apikey === null) {
          post_theServer(1);
        }
        if (d.chrome && d.chrome !== version) {
          localStorage.setItem('alert_outdated', 'yes');
        } else if (version === d.chrome) {
          localStorage.removeItem('alert_outdated');
        }
      } else {
        console.log('__ empty from theServer');
      }
    }, 'json'
  ).fail(function () {
    DEBUG && console.log('>> post_theServer, error');
  }).always(function () {
    loading_theServer = false;
    console.timeEnd('Call theServer for values');
  });
}

function get_local_ip () {
  console.time('Call theServer for local IP');
  return $.get('https://node.thepaperlink.com:8081', function (d) {
    local_ip = d.split(' | ')[3];
    if (local_ip && local_ip.indexOf('::ffff:') > -1) {
      local_ip = local_ip.split('::ffff:')[1];
    }
    if (local_ip && !uid) {
      uid = local_ip + ':';
      uid += extension_load_date.getTime();
      localStorage.setItem('ip_time_uid', uid);
    }
    console.log('>> get_local_ip: ' + local_ip);
  }).fail(function () {
    DEBUG && console.log('>> get_local_ip error');
  }).always(function () {
    console.timeEnd('Call theServer for local IP');
  });
}

function get_server_data (v) {
  if (!loading_theServer) {
    loading_theServer = true;
  } else {
    return;
  }
  let req;
  if (!local_ip) {
    req = get_local_ip();
  }
  if (req) {
    $.when(req).then(function () {
      post_theServer(v);
    });
  } else {
    post_theServer(v);
  }
}

function load_common_values (newday) {
  apikey = localStorage.getItem('thepaperlink_apikey') || null;
  req_key = apikey;
  if (req_key === null) {
    req_key = guest_apikey;
    if (req_key === null && load_try > -4 && window.navigator.onLine) {
      load_try -= 1;
      get_server_data(1);
      setTimeout(load_common_values, arbitrary_sec * 1000);
      return;
    }
    localStorage.removeItem('mendeley_status');
    localStorage.removeItem('facebook_status');
    localStorage.removeItem('dropbox_status');
    localStorage.removeItem('douban_status');
    localStorage.removeItem('googledrive_status');
    localStorage.removeItem('onedrive_status');
    localStorage.removeItem('baiduyun_status');
  }
  pubmeder_apikey = localStorage.getItem('pubmeder_apikey') || null;
  pubmeder_email = localStorage.getItem('pubmeder_email') || null;
  ncbi_api = localStorage.getItem('tpl_ncbi_api') || null;
  pubmeder_ok = !!(pubmeder_apikey !== null && pubmeder_email !== null);
  cloud_op = '';
  const m_status = localStorage.getItem('mendeley_status');
  if (m_status && m_status === 'success') {
    cloud_op += 'm';
  }
  const f_status = localStorage.getItem('facebook_status');
  if (f_status && f_status === 'success') {
    cloud_op += 'f';
  }
  const d_status = localStorage.getItem('dropbox_status');
  if (d_status && d_status === 'success') {
    cloud_op += 'd';
  }
  const b_status = localStorage.getItem('douban_status');
  if (b_status && b_status === 'success') {
    cloud_op += 'b';
  }
  const g_status = localStorage.getItem('googledrive_status');
  if (g_status && g_status === 'success') {
    cloud_op += 'g';
  }
  const o_status = localStorage.getItem('onedrive_status');
  if (o_status && o_status === 'success') {
    cloud_op += 'o';
  }
  const y_status = localStorage.getItem('baiduyun_status');
  if (y_status && y_status === 'success') {
    cloud_op += 'y';
  }
  // 2015-12-9: !!expr returns a Boolean value (true or false)
  if (localStorage.getItem('scholar_once') !== 'no') {
    scholar_page_open_limits = 0; // 2021-5-20
    scholar_no_more = 1;
  } else {
    scholar_no_more = 0;
  }
  local_mirror = localStorage.getItem('local_mirror') || '127.0.0.1';
  ezproxy_prefix = localStorage.getItem('ezproxy_prefix') || '';
  cc_address = localStorage.getItem('cc_address') || '';
  arbitrary_sec = localStorage.getItem('arbitrary_sec') || 3;
  if (newday === undefined) {
    let syncValues = {};
    for (i = 0, len = localStorage.length; i < len; i += 1) {
      aKey = localStorage.key(i);
      aVal = localStorage.getItem(aKey);
      if (!aKey || aVal === null) {
        localStorage.removeItem(aKey);
        continue;
      } else if (aVal.indexOf('undefined') > -1 || aVal === '[object Object]' || aKey.indexOf('pmid_') === 0) {
        localStorage.removeItem(aKey);
        continue;
      } else if (aKey.indexOf('tabId:') === 0 ||
          aKey.indexOf('diff_') === 0 ||
          aKey.indexOf('day_') === 0 ||
          aKey.indexOf('email_') === 0 ||
          aKey.indexOf('shark_') === 0 ||
          aKey.indexOf('scholar_') === 0 ||
          aKey.indexOf('abs_') === 0) {
        continue;
      }
      syncValues[aKey] = '' + aVal;
    }
    localStorage.setItem('justDid_load_common_values', 'now');
    console.time('>> save common values to storage.sync');
    chrome.storage.sync.set(syncValues, function () {
      console.timeEnd('>> save common values to storage.sync');
    });
  }
  if (!jcr_obj.length) {
    load_JCR(); // timeEnd
  } else {
    console.timeEnd('>> load common values');
  }
}
console.time('>> load common values');
load_common_values(1);

function open_new_tab (url, winId, idx) {
  let tab_obj = { url: url, active: true };
  if (winId) {
    tab_obj.windowId = winId;
  }
  if (idx) {
    tab_obj.index = idx;
  }
  DEBUG && console.log('tab_obj', tab_obj);
  chrome.tabs.create(tab_obj, function (tab) {
    DEBUG && console.log('>> a new tab for you, #' + tab.id);
  });
}

function oauth_on_click (info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  open_new_tab('https://www.thepaperlink.com/oauth', tab.windowId, tab.index);
}

function js_on_click (info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  open_new_tab(base + '/js/', tab.windowId, tab.index);
}

function select_on_click (info, tab) {
  let url = base;
  if (alldigi.test(info.selectionText)) {
    url += '/:' + info.selectionText;
  } else {
    url += '/?q=' + info.selectionText;
  }
  if (localStorage.getItem('new_tab') === 'no') {
    chrome.tabs.update({ url: url, active: true });
  } else {
    open_new_tab(url, tab.windowId, tab.index);
  }
}

function b_proxy (tab_id, _data) { // process ws action
  if (tab_id) { chrome.tabs.sendMessage(tab_id, _data); }
}

function menu_generator () {
  chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    title: 'Search the paper link for \'%s\'',
    contexts: ['selection'],
    onclick: select_on_click
  });
  chrome.contextMenus.create({
    title: 'Bookmark tool',
    contexts: ['page'],
    onclick: js_on_click
  });
  chrome.contextMenus.create({
    type: 'separator',
    contexts: ['page', 'selection']
  });
  chrome.contextMenus.create({
    title: 'Stored search',
    contexts: ['page', 'selection'],
    onclick: function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.runtime.getURL('history.html'),
          active: true
        });
      });
    }
  });
  chrome.contextMenus.create({
    title: 'extension Options',
    contexts: ['page', 'selection'],
    onclick: function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.runtime.getURL('options.html'),
          active: true
        });
      });
    }
  });
  chrome.contextMenus.create({
    title: 'Authorize connections',
    contexts: ['page', 'selection'],
    onclick: oauth_on_click
  }); // , 'link', 'editable', 'image', 'video', 'audio'
}

function save_visited_ID (new_id) {
  if (!new_id || new_id === '999999999') {
    return;
  }
  const id_found = localStorage.getItem('id_found') || '';
  if (id_found.indexOf(new_id) === -1) {
    localStorage.setItem('id_found', id_found + ' ' + new_id);
  }
  if (id_found && id_found.split(' ').length > 11) {
    saveIt_pubmeder(localStorage.getItem('id_found').replace(/\s+/g, ','));
  }
}

function saveIt_pubmeder (pmid) {
  if (!pubmeder_ok) {
    DEBUG && console.log('>> no valid pubmeder credit');
    return;
  }
  const args = {
    apikey: pubmeder_apikey,
    email: pubmeder_email,
    pmid: pmid
  };
  let saveurl = 'https://0.thepaperlink.com/input'; // 2020-8-23
  if (localStorage.getItem('rev_proxy') === 'yes') {
    saveurl = 'https://0.thepaperlink.cn/input'; // 2020-8-23
  }
  $.getJSON(saveurl, args, function (d) {
    if (d.respond > 1) {
      let pre_history = localStorage.getItem('id_history') || '';
      pre_history.replace(/^,+|,+$/g, '');
      pre_history += ',' + pmid;
      localStorage.setItem('id_history', pre_history);
      localStorage.setItem('id_found', '');
    }
  }).fail(function () {
    const date = new Date();
    localStorage.setItem('pubmed_' + pmid, date.getTime());
  });
}

function eSearch (search_term, tabId) {
  let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&term=' + search_term;
  if (ncbi_api) {
    url += '&api_key=' + ncbi_api;
  }
  console.time('data directly from eUtils');
  $.get(url,
    function (xml) {
      const pmid = $(xml).find('Id');
      if (pmid.length === 1) {
        aVal = '' + pmid.text();
        save_visited_ID(aVal);
        aKey = {};
        aKey['tabId:' + tabId] = aVal;
        chrome.storage.local.set(aKey);
      }
    }, 'xml'
  ).fail(function () {
    DEBUG && console.log('>> eSearch failed, do nothing');
  }).always(function () {
    console.timeEnd('data directly from eUtils');
  });
}

function send_binary (aB, pmid, upload, no_email) {
  try {
    const xhr = new XMLHttpRequest();
    const boundary = 'AJAX------------------------AJAX';
    const contentType = 'multipart/form-data; boundary=' + boundary;
    const postHead = '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
            'Content-Type: application/octet-stream\r\n\r\n';
    const postTail = '\r\n--' + boundary + '--';
    const abView = new Uint8Array(aB);
    let post_data = postHead;
    console.log('__ download the file size ' + abView.length + ', prepare uploading');
    if (abView.length < 1000) {
      return;
    }
    for (i = 0, len = abView.length; i < len; i += 1) {
      post_data += String.fromCharCode(abView[i] & 0xff);
    }
    post_data += postTail;
    if (typeof XMLHttpRequest.prototype.sendAsBinary === 'function') {
      DEBUG && console.log('>> sendAsBinary support is built-in');
    } else {
      DEBUG && console.log('>> define sendAsBinary');
      XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
        function byteValue (x) {
          return x.charCodeAt(0) & 0xff;
        }
        const ords = Array.prototype.map.call(datastr, byteValue);
        const ui8a = new Uint8Array(ords);
        // this.send(ui8a.buffer); // Chrome 22, support ArrayBufferViews
        this.send(ui8a);
      };
    }
    xhr.open('POST', upload, true);
    xhr.onload = function () {
      console.log('__ upload the file to theServer with status: ' + xhr.status);
      if (xhr.responseText === null) {
        DEBUG && console.log('>> email_pdf failed');
        if (!no_email && apikey) {
          // email_abstract, 2018-9-14
          const date = new Date();
          localStorage.setItem('email_' + apikey + '_' + pmid, date.getTime());
        }
      }
    };
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.sendAsBinary(post_data);
  } catch (err) {
    DEBUG && console.log(err);
  }
}

function get_binary (file, pmid, upload, no_email) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', file, true);
  xhr.responseType = 'arraybuffer'; // Synchronous requests cannot have XMLHttpRequest.responseType set
  // 2013-2-13 'ArrayBufferViews' still error
  xhr.onload = function () {
    const aB = xhr.response; // not xhr.responseText
    if (aB) {
      send_binary(aB, pmid, upload, no_email);
    }
  };
  xhr.send(null);
}

function dropbox_it (pmid, pdf, k) { // dropbox, mendeley, googledrive, onedrive, baiduyun
  $.get(
    base + '/file/new',
    { apikey: k, no_email: 1 },
    function (ul) {
      get_binary(pdf, pmid, ul, 1);
    },
    'text'
  ).fail(function () {
    DEBUG && console.log('>> dropbox_it failed: ' + pdf);
  });
}

function queue_scholar_title () {
  setTimeout(
    do_scholar_title,
    1000 * scholar_run + Math.floor(Math.random() * 10000)
  );
}

function do_scholar_title () {
  const pmid = scholar_queue[3 * scholar_run];
  const t = scholar_queue[3 * scholar_run + 1];
  const tabId = scholar_queue[3 * scholar_run + 2];
  scholar_run += 1;
  if (scholar_run === scholar_count) {
    DEBUG && console.log('>> self-reset scholar_count _run _queue');
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
  }
  DEBUG && console.log('call scholar_title() at', new Date());
  if (pmid && t) {
    scholar_title(pmid, t, tabId);
  }
}

function scholar_title (pmid, t, tabId) {
  DEBUG && console.log('pmid =', pmid, ', title = ', t);
  if (scholar_no_more) {
    b_proxy(tabId, {
      g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
    });
    return;
  }
  b_proxy(tabId, {
    g_scholar: 1, pmid: pmid, g_num: 1, g_link: 1
  });
  const url = 'https://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq=' +
      encodeURIComponent('"' + t + '"');
  // blocked by CORS policy: No 'Access-Control-Allow-Origin' header
  $.get(url,
    function (r) {
      const reg = /<a[^<]+>Cited by \d+<\/a>/;
      const h = reg.exec(r);
      let g_num = []; let g_link = [];
      if (h && h.length) {
        // console.log(h);
        g_num = />Cited by (\d+)</.exec(h[0]);
        g_link = /href="([^"]+)"/.exec(h[0]);
        if (g_num.length === 2 && g_link.length === 2) {
          localStorage.setItem('scholar_' + pmid, pmid + ',' + g_num[1] + ',' + g_link[1]);
          b_proxy(tabId, {
            g_scholar: 1, pmid: pmid, g_num: g_num[1], g_link: g_link[1]
          });
          $.post(base + '/',
            { apikey: req_key, pmid: pmid, g_num: g_num[1], g_link: g_link[1] },
            function (d) {
              DEBUG && console.log('>> post g_num and g_link (empty is a success): ' + d);
            }, 'json'
          );
          return;
        }
      }
      b_proxy(tabId, {
        g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
      });
    },
    'html'
  ).fail(function () {
    DEBUG && console.log('>> scholar_title failed');
    b_proxy(tabId, {
      g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
    });
    if (parseInt(localStorage.getItem(date_str), 10) < 1) {
      scholar_page_open_limits = 0;
    }
    if (scholar_page_open_limits > 0) {
      scholar_page_open_limits -= 1;
      localStorage.setItem(date_str, scholar_page_open_limits);
      open_new_tab('https://scholar.google.com/');
    }
    if (localStorage.getItem('scholar_once') !== 'no' || scholar_page_open_limits === 0) {
      scholar_no_more = 1;
    }
  });
}

function do_download_shark (pmid, url) {
  const id = localStorage.getItem('downloadId_' + pmid);
  if (id) {
    chrome.downloads.search({ url: url },
      function (item) {
        DEBUG && console.log('filename', item);
        if (item.length && localStorage.getItem('shark_open_files') === 'yes') {
          chrome.tabs.create({
            url: 'file://' + item[0].filename,
            active: false
          });
        } else if (!item.length) {
          localStorage.removeItem('downloadId_' + pmid);
        }
      });
  } else {
    chrome.downloads.download(
      { url: url, filename: 'pmid_' + pmid + '.pdf', method: 'GET' },
      function (id) {
        localStorage.setItem('downloadId_' + pmid, id);
        DEBUG && console.log('downloadId', id);
        if (localStorage.getItem('shark_open_files') === 'yes') {
          chrome.downloads.open(id); //@@@@ user gesture
        } else {
          console.log(id, pmid, url);
        }
      });
    if (apikey && localStorage.getItem('rev_proxy') !== 'yes' && localStorage.getItem('dropbox_status') === 'success') {
      dropbox_it(pmid, url, apikey);
    }
  }
}

function prepare_download_shark (tabId, pmid, args) {
  if (args.shark_link && args.shark_link.indexOf(' ') > 0) {
    console.log('>> shark_link with space', args);
    return;
  }
  localStorage.setItem('shark_' + pmid, pmid + ',' + args.shark_link);
  b_proxy(tabId, { el_id: '_shark' + pmid, el_data: args.shark_link });
  $.post(base + '/', args,
    function (d) {
      DEBUG && console.log('>> post shark_link (empty is a success): ' + d);
    }, 'json'
  );
  if (localStorage.getItem('shark_download') === 'yes') {
    do_download_shark(pmid, args.shark_link + '?download=true');
  }
}

function parse_shark (pmid, url, tabId) {
  DEBUG && console.log(pmid, url, tabId);
  // blocked by CORS policy: No 'Access-Control-Allow-Origin' header
  let in_mem = localStorage.getItem('shark_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    b_proxy(tabId, { el_id: '_shark' + pmid, el_data: in_mem[1] });
    if (localStorage.getItem('shark_download') === 'yes') {
      do_download_shark(pmid, in_mem[1]);
    }
    return;
  }
  if (shark_limits <= 0) {
    return;
  }
  shark_limits -= 1;
  b_proxy(tabId, { el_id: '_shark' + pmid, el_data: 1 });
  const reg = /embed type="application\/pdf" src\s*=\s*"(\S+)"/i; let h;
  let args = { apikey: req_key, pmid: pmid, shark_link: '' };
  $.get(url,
    function (r) {
      h = reg.exec(r);
      if (h && h.length) {
        DEBUG && console.log(h);
        if (h[1].indexOf('sci-hub.') > 0) {
          args.shark_link = 'https://' + h[1].split('//')[1].split('#')[0];
        } else {
          args.shark_link = 'https://' + local_mirror + h[1].split('#')[0];
        }
        prepare_download_shark(tabId, pmid, args);
      } else if (r.indexOf('smile">:(') > 0) {
        console.log('>> not in', url, pmid);
      } else {
        console.log(r);
      }
    },
    'html'
  ).fail(function () {
    DEBUG && console.log('>> parse_shark failed, do nothing');
  });
}

function parse_pii (pmid, url, tabId) {
  DEBUG && console.log(pmid, url, tabId);
  return false;
  // blocked by CORS policy: No 'Access-Control-Allow-Origin' header
  let in_mem = localStorage.getItem('url_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    b_proxy(tabId, { el_id: '_pdf' + pmid, el_data: in_mem[1] });
    in_mem = localStorage.getItem('scopus_' + pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 2);
      b_proxy(tabId, { el_id: 'pl4_scopus' + pmid, el_data: in_mem[1] });
    }
    return;
  }
  b_proxy(tabId, { el_id: '_pdf' + pmid, el_data: 1 });
  $.get(url,
    function (r) {
      const reg = /href="([^"]+)" target="newPdfWin"/;
      const reg2 = /Cited by in Scopus \((\d+)\)/i;
      const h = reg.exec(r);
      const h2 = reg2.exec(r);
      let args;
      if (h && h.length) {
        DEBUG && console.log(h);
        args = { apikey: req_key, pmid: pmid, pii_link: h[1] };
        if (h2 && h2.length) {
          DEBUG && console.log(h2);
          args.scopus_n = h2[1];
          localStorage.setItem('scopus_' + pmid, pmid + ',' + h2[1]);
          b_proxy(tabId, { el_id: 'pl4_scopus' + pmid, el_data: h2[1] });
        }
        localStorage.setItem('url_' + pmid, pmid + ',' + h[1]);
        b_proxy(tabId, { el_id: '_pdf' + pmid, el_data: h[1] });
        $.post(base + '/', args,
          function (d) {
            DEBUG && console.log('>> post pii_link (empty is a success): ' + d);
          }, 'json'
        );
        return;
      }
      b_proxy(tabId, { el_id: '_pdf' + pmid, el_data: '://' });
    },
    'html'
  ).fail(function () {
    DEBUG && console.log('>> parse_pii failed, do nothing');
  });
}

function load_broadcast () {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  if (!window.WebSocket) {
    return;
  } else if (!window.navigator.onLine) {
    console.log('__ it is very possible that you are off the Internet...');
    if (!ws_timer) {
      ws_timer = setInterval(load_broadcast, 1800 * 1000);
    }
    return;
  }
  clearInterval(ws_timer);
  ws_timer = null;
  ws = new WebSocket('wss://' + ws_addr);
  // ws.readyState: 0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSED
  ws.onopen = function () {
    DEBUG && console.log('>> ws is established');
    broadcast_loaded = true;
    ws.send('{"apikey":"' + req_key + '"}');
  };
  ws.onclose = function () {
    if (broadcast_loaded) {
      console.log('__ server comminucation lost, reconnecting...');
      if (load_try < 0) {
        DEBUG && console.log('>> ws is broken');
        broadcast_loaded = false;
        return;
      }
      if (window.navigator.onLine) {
        load_try -= 1;
      }
      setTimeout(load_broadcast, 3000);
    } else {
      DEBUG && console.log('>> ws is closed');
    }
  };
  ws.onerror = function (err) {
    DEBUG && console.log('>> ws error: ' + err);
  };
  ws.onmessage = function (message) {
    try {
      const d = JSON.parse(message.data);
      DEBUG && console.log(d);
      if (d.apikey === req_key && d.action) {
        chrome.tabs.query({ active: true, currentWindow: true },
          function (tabs) { // current tab and window, not perfect
            if (d.action === 'title') {
              scholar_title(d.pmid, d.title, tabs[0].id);
            } else if (d.action === 'url') {
              parse_pii(d.pmid, d.url, tabs[0].id);
            } else if (d.action === 'pdfLink_quick') {
              b_proxy(tabs[0].id, { el_id: 'pdfLink_quick', el_data: d.pdfLink_quick });
            }
          });
        if (d.action === 'dropbox_it' && d.pdf.substr(0, 7).toLowerCase() === 'http://') {
          dropbox_it(d.pmid, d.pdf, d.apikey);
        }
      }
      if (d.apikey8011) { console.log('@@@@ ws.onmessage ' + d.apikey8011); }
    } catch (err) {
      DEBUG && console.log('>> json parse error: ' + message.data);
    }
  };
}

function reLoad_options () {
  const urlOp = chrome.runtime.getURL('options.html');
  chrome.tabs.query({ url: urlOp }, function (tabs) {
    for (aKey in tabs) {
      chrome.tabs.update(tabs[aKey].id, { url: urlOp });
    }
  });
}

function common_dThree (itemZero, withRed) {
  let tmp; let extra = '';
  if (itemZero.slfo && itemZero.slfo !== '~' && parseFloat(itemZero.slfo) > 0) {
    tmp = '<span>impact<i style="font-size:75%">' + itemZero.slfo + '</i></span>';
    extra += tmp;
  }
  if (itemZero.pdf) {
    tmp = '<a class="thepaperlink-green" href="' +
          ez_format_link(ezproxy_prefix, itemZero.pdf) +
          '" target="_blank">direct&nbsp;pdf</a>';
    extra += tmp;
  }
  if (withRed && itemZero.f_v && itemZero.fid) {
    tmp = '<a class="thepaperlink-red" href="' +
          ez_format_link(ezproxy_prefix, 'https://connect.h1.co/article/' + itemZero.fid) +
          '" target="_blank">f1000<sup>' + itemZero.f_v + '</sup></a>';
    extra += tmp;
  }
  if (itemZero.doi && local_mirror && local_mirror !== '127.0.0.1') {
    tmp = '<a href="https://' + local_mirror + '/' + itemZero.doi + '#" target="_blank">&#8623;</a>';
    extra += tmp;
  }
  return extra;
}

function call_from_other_sites (pmid, tabId, fid, f_v) {
  if (!pmid) { return; }
  chrome.storage.local.get(['tpl' + pmid], function (ddd) {
    const dd = ddd['tpl' + pmid];
    if (dd && dd.pmid === pmid) {
      aVal = common_dThree(dd, 0);
      if (aVal) {
        aVal = ': ' + aVal;
        if (pubmeder_ok || cloud_op) { // 2020-8-21
          aVal += '<span id="thepaperlink_save' + pmid +
                  '" class="thepaperlink-home">save</span>';
        }
      }
      chrome.tabs.sendMessage(tabId,
        { to_other_sites: 'thepaperlink_bar', uri: base, pmid: pmid, extra: aVal });
    } else {
      $.getJSON(base + '/api',
        { a: 'chrome3', pmid: pmid, apikey: req_key,
          runtime: '' + chrome.runtime.id,
          ncbi_api: ncbi_api || '' },
        function (d) {
          if (d && d.count === 1) {
            aVal = common_dThree(d.item[0], 0);
            if (aVal) {
              aVal = ': ' + aVal;
              if (pubmeder_ok || cloud_op) { // 2020-8-21
                aVal += '<span id="thepaperlink_save' + pmid +
                        '" class="thepaperlink-home">save</span>';
              }
            }
            chrome.tabs.sendMessage(tabId,
              { to_other_sites: 'thepaperlink_bar', uri: base, pmid: pmid, extra: aVal });
            aKey = {};
            aKey['tpl' + pmid] = d.item[0];
            aKey['tpl' + pmid].date_str = date_str;
            if (localStorage.getItem('abs_' + pmid) && !d.item[0].abstract) {
              aKey['tpl' + pmid].abstract = localStorage.getItem('abs_' + pmid);
            }
            chrome.storage.local.set(aKey);
            if (fid && f_v && (
                !d.item[0].fid || (d.item[0].fid === fid && d.item[0].f_v !== f_v)
              )) {
              $.post(base + '/',
                { apikey: req_key, pmid: pmid, fid: fid, f_v: f_v },
                function (d) {
                  DEBUG && console.log('>> post f1000 data (empty is a success): ' + d);
                }, 'json'
              );
            }
          } else if (!d.error) {
            DEBUG && console.log(d);
          }
        }).fail(function (jqXHR, textStatus, errorThrown) {
          if (textStatus !== '503') {
            base = 'https://www.thepaperlink.cn';
            console.log('call_from_other_sites fail: access theServer Not-Google');
          } else {
            console.log('call_from_other_sites fail', textStatus, errorThrown);
          }
      });
    } // if chrome.storage.local.get
  });
}

function get_request (msg, _port) {
  // console.log(msg);
  let sender_tab_id = null;
  let pmid; let tmp; let args;
  if (_port && _port.sender && _port.sender.tab) {
    sender_tab_id = _port.sender.tab.id;
  } else if (_port && _port.sender && msg.tabId) {
    sender_tab_id = msg.tabId; // ess.js
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    base = 'https://www.thepaperlink.cn';
  }
  // respond to msg
  if (msg.load_local_mirror) {
    _port && _port.postMessage({
      local_mirror: local_mirror,
      arbitrary_pause: arbitrary_sec * 1000
    });
  } else if (msg.url) {
    let request_url = base + msg.url + req_key + '&runtime=' + chrome.runtime.id;
    if (uid && uid !== 'unknown') {
      request_url += '&uid=' + uid;
    }
    if (ncbi_api) {
      request_url += '&ncbi_api=' + ncbi_api;
    } else {
      _port && _port.postMessage({ except: 'Flash.' });
    }
    DEBUG && console.time('Call theServer api for json');
    $.getJSON(request_url, function (d) {
      if (d && (d.count || d.error)) { // good or bad, both got json return
        _port && _port.postMessage(
          {
            r: d,
            tpl: apikey,
            pubmeder: pubmeder_ok,
            cloud_op: cloud_op,
            uri: base,
            p: ezproxy_prefix,
            year: get_yearStr()
          }
        );
        if (d && d.count) {
          tmp = {};
          for (i = 0; i < d.count; i += 1) {
            tmp['tpl' + d.item[i].pmid] = d.item[i];
            tmp['tpl' + d.item[i].pmid].date_str = date_str;
            if (localStorage.getItem('abs_' + d.item[i].pmid) && !d.item[i].abstract) {
              tmp['tpl' + d.item[i].pmid].abstract = localStorage.getItem('abs_' + d.item[i].pmid);
            }
          }
          chrome.storage.local.set(tmp);
        }
      } else {
        if (apikey) {
          _port && _port.postMessage({ except: 'JSON parse error.', tpl: apikey });
        } else {
          _port && _port.postMessage({ except: 'Usage limits exceeded.', tpl: '' });
        }
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      if (textStatus === '503') {
        _port && _port.postMessage({ except: 'The server is overloaded.', tpl: apikey });
        console.log(textStatus, errorThrown, request_url);
      } else if (errorThrown && apikey) {
        console.log('>> get_request fail: ' + errorThrown);
        _port && _port.postMessage({ except: 'No additional info.', tpl: apikey });
      } else if (errorThrown) {
        console.log('>> get_request fail: ' + errorThrown);
        _port && _port.postMessage({ except: 'Guest usage limited. Fix by visit ' + base + '/reg', tpl: '' });
      } else {
        _port && _port.postMessage({ except: 'Offline.' });
      }
      if (textStatus !== '503' && base === 'https://www.thepaperlink.com') {
        base = 'https://www.thepaperlink.cn';
        console.log('getJSON fail: access theServer Not-Google');
      }
    }).always(function () {
      DEBUG && console.timeEnd('Call theServer api for json');
    });
  } else if (msg.ncbi_api) {
    localStorage.setItem('tpl_ncbi_api', msg.ncbi_api);
    ncbi_api = msg.ncbi_api;
    reLoad_options();
  } else if (msg.save_apikey) {
    if (msg.save_email) {
      localStorage.setItem('pubmeder_apikey', msg.save_apikey);
      localStorage.setItem('pubmeder_email', msg.save_email);
      localStorage.setItem('b_apikey_gold', 'yes');
      pubmeder_apikey = msg.save_apikey;
      pubmeder_email = msg.save_email;
      pubmeder_ok = true;
    } else {
      localStorage.setItem('thepaperlink_apikey', msg.save_apikey);
      localStorage.setItem('a_apikey_gold', 'yes');
      apikey = msg.save_apikey;
      req_key = apikey;
    }
    reLoad_options();
  } else if (msg.service && msg.content) {
    if (msg.content.indexOf('error') < 0) {
      localStorage.setItem(msg.service + '_status', 'success');
    } else {
      localStorage.setItem(msg.service + '_status', 'error? try again please');
    }
    reLoad_options();
  } else if (msg.sendID) {
    // if (localStorage.getItem('co_pubmed') !== 'no') {
    // chrome.pageAction.show(sender_tab_id);
    if (Array.isArray(msg.sendID)) {
      if (sender_tab_id) {
        aKey = {};
        aKey['tabId:' + sender_tab_id] = msg.sendID.join(',');
        chrome.storage.local.set(aKey);
      }
      // save_visited_ID(msg.sendID); // @@@@
    } else if (alldigi.test(msg.sendID)) {
      save_visited_ID(msg.sendID);
      if (sender_tab_id) {
        aKey = {};
        aKey['tabId:' + sender_tab_id] = msg.sendID;
        chrome.storage.local.set(aKey);
      }
    } else if (sender_tab_id) {
      eSearch(msg.sendID, sender_tab_id);
    }
    // } else {
    //  DEBUG && console.log('>> do nothing to sendID #' + msg.sendID);
    // }
  } else if (msg.prjID && msg.doi) {
    $.getJSON(base + '/api',
      { prjID: msg.prjID, doi: msg.doi, apikey: apikey, input: 1 },
      function (d) {
        console.log(msg.prjID, msg.doi, d);
      });
  } else if (msg.menu_display) {
    if (localStorage.getItem('contextMenu_shown') !== 'no') {
      menu_generator();
      // just generated context menu
    } else {
      DEBUG && console.log('>> no need to update context menu');
    }
  } else if (msg.saveIt && (pubmeder_ok || cloud_op)) {
    if (pubmeder_ok) {
      saveIt_pubmeder(msg.saveIt);
    }
    if (apikey && msg.saveIt.indexOf(',') < 0) {
      $.post(base + '/api',
        { pmid: msg.saveIt, apikey: apikey },
        function () {
          console.log('>> saveIt success: ' + msg.saveIt);
        }).fail(function () {
        console.log('>> saveIt fail: ' + msg.saveIt);
      });
    }
  } else if (msg.money_emailIt ||
             msg.money_reportWrongLink ||
             msg.money_needInfo ||
             msg.money_email_pdf) {
    let post_action = '';
    const action_pmid = msg.money_emailIt || msg.money_reportWrongLink || msg.money_needInfo;
    if (msg.money_emailIt) {
      if (msg.pdf) {
        console.log('@@@@ ' + msg.pdf);
      }
      if (msg.new_doi) {
        post_action = 'new_doi';
      } else {
        if (apikey && ws && msg.doi) {
          ws.send('{"apikey":"' + apikey + '","doi":"' + msg.doi + '"}');
        }
        post_action = 'email';
        _port && _port.postMessage({ Off_id: 'thepaperlink_A' + action_pmid });
      }
      /*
if (typeof window.email_pdf === 'undefined') {
  window.email_pdf = function (pmid, apikey, no_email) {
      var bv = jq183Tpl('#thepaperlink_A' + pmid).html(),
        args = {'apikey': apikey},
        answer = null;
      if (no_email) {
        args = {'apikey': apikey, 'no_email': 1};
      } else {
        answer = confirm('\nEmail the pdf of this paper to you?\n\nCaution: it might fail, then only the abstract will be sent [' + bv + ']\n');
      }
      if (answer || no_email) {
        jq183Tpl.ajax({
          url: thepaperlink_base + 'file/new',
          dataType: 'jsonp',
          data: args,
          //async: false,
          success: function (upload_url) {
            var dom = document.getElementById('thepaperlink_hidden' + pmid),
              customEvent = document.createEvent('Event');
            customEvent.initEvent('email_pdf', true, true);
            dom.innerText = upload_url;
            if (!no_email) {
              jq183Tpl('#thepaperlink_D' + pmid).fadeOut('fast');
            } else {
              jq183Tpl('#thepaperlink_save' + pmid).addClass('no_email');
            }
            dom.dispatchEvent(customEvent);
          }
        });
      }
    };
  } */
    } else if (msg.money_reportWrongLink) {
      post_action = 'wrong_link';
      _port && _port.postMessage({ Off_id: 'thepaperlink_B' + action_pmid });
    } else if (msg.money_needInfo) {
      post_action = 'more_info';
      _port && _port.postMessage({ Off_id: 'thepaperlink_C' + action_pmid });
    }
    if (apikey && post_action !== '') {
      args = { pmid: action_pmid, apikey: apikey, action: post_action };
      if (post_action === 'email' && cc_address) {
        args.cc = cc_address;
      }
      if (post_action === 'new_doi' && msg.doi) {
        args.new_doi = msg.doi;
      }
      $.post(base, args,
        function () {
          console.log('>> action ' + post_action + ' success: ' + action_pmid);
        }).fail(function () {
        console.log('>> action ' + post_action + ' fail: ' + action_pmid);
      });
    }
  } else if (msg.upload_url && msg.pdf && msg.pmid && apikey) {
    if (msg.pdf.substr(0, 7).toLowerCase() === 'http://') {
      get_binary(msg.pdf, msg.pmid, msg.upload_url, msg.no_email);
    } else if (!msg.no_email) {
      // email_abstract, 2018-9-14
      const date = new Date();
      localStorage.setItem('email_' + apikey + '_' + msg.pmid, date.getTime());
    }
  } else if (msg.save_cloud_op) {
    if (msg.save_cloud_op.indexOf('mendeley') > -1) {
      localStorage.setItem('mendeley_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('facebook') > -1) {
      localStorage.setItem('facebook_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('dropbox') > -1) {
      localStorage.setItem('dropbox_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('douban') > -1) {
      localStorage.setItem('douban_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('googledrive') > -1) {
      localStorage.setItem('googledrive_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('onedrive') > -1) {
      localStorage.setItem('onedrive_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('baiduyun') > -1) {
      localStorage.setItem('baiduyun_status', 'success');
    }
  } else if (msg.t_cont) {
    const holder = dd.getElementById('clippy_t');
    holder.style.display = 'block';
    // 2018-9-14 @@@@ so_noDate
    // 2022-2-23 move from contentscript.js
    if (msg.t_cont.indexOf('Free article.') > 0) {
      msg.t_cont = msg.t_cont.replace(' Free article.', '');
    }
    if (msg.t_cont.indexOf('Free PMC article.') > 0) {
      msg.t_cont = msg.t_cont.replace(' Free PMC article.', '');
    }
    if (msg.t_cont.indexOf('Review.') > 0) {
      msg.t_cont = msg.t_cont.replace(' Review.', '');
    }
    if (msg.t_cont.indexOf('Online ahead of print.') > 0) {
      msg.t_cont = msg.t_cont.replace(' Online ahead of print.', '');
    }
    if (msg.t_cont.indexOf('Among authors: ') > 0) {
      const _tt = msg.t_cont.split('Among authors: ');
      holder.value = _tt[0] + _tt[1].substr(_tt[1].indexOf('.') + 2);
    } else {
      holder.value = msg.t_cont;
    }
    holder.select();
    dd.execCommand('Copy');
    holder.style.display = 'none';
  } else if (msg.load_common_values) {
    load_common_values();
  } else if (msg.a_pmid && msg.a_title) {
    let in_mem = localStorage.getItem('scholar_' + msg.a_pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 3);
      _port && _port.postMessage({
        g_scholar: 1, pmid: in_mem[0], g_num: in_mem[1], g_link: in_mem[2]
      });
    } else if (!scholar_no_more) {
      scholar_queue[3 * scholar_count] = msg.a_pmid;
      scholar_queue[3 * scholar_count + 1] = msg.a_title;
      scholar_queue[3 * scholar_count + 2] = sender_tab_id;
      scholar_count += 1;
      queue_scholar_title();
    }
  } else if (msg.reset_gs_counts) {
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
    shark_limits = localStorage.getItem('shark_limit') || 3;
  } else if (msg.load_broadcast) {
    broadcast_loaded = false;
    if (ws) {
      ws.close();
    }
    load_broadcast();
  } else if (msg.pii_link && msg.pii && msg.pmid) {
    // if (localStorage.getItem('ajax_pii_link') !== 'no') {
    //  parse_pii(msg.pmid, 'http://linkinghub.elsevier.com/retrieve/pii/' + msg.pii, sender_tab_id);
    // }
    console.log('pii', msg.pii, msg.pmid); // msg.pii_link, @@@@ S1534580722001666 S0092867408009392
    //if (localStorage.getItem('shark_link') !== 'no') {
    //  parse_shark(msg.pmid, 'https://' + local_mirror + '/retrieve/pii/' + msg.pii, sender_tab_id);
    //}
  } else if (msg.doi_link && msg.doi && msg.pmid) {
    if (localStorage.getItem('shark_link') !== 'no') {
      parse_shark(msg.pmid, 'https://' + local_mirror + '/' + msg.doi, sender_tab_id);
    }
  } else if (msg.search_term) {
    if (msg.search_result_count && msg.search_result_count > 1) {
      let terms = localStorage.getItem('past_search_terms');
      const term_lower = msg.search_term.toLowerCase()
                         .replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' ');
      const one_term_saved = localStorage.getItem(term_lower);
      const end_num = get_end_num(one_term_saved);
      let digitals = get_ymd();
      digitals.push(msg.search_result_count);
      if (!terms || terms.indexOf(term_lower) < 0) {
        if (!terms) { terms = ''; }
        terms += term_lower + '||';
        localStorage.setItem('past_search_terms', terms);
      }
      if (one_term_saved) {
        if (end_num && end_num !== msg.search_result_count) {
          localStorage.setItem(term_lower, one_term_saved + '||' + digitals.join(','));
          if (end_num > msg.search_result_count) {
            console.log('__ the search result count goes down: ' + msg.search_term);
          }
          _port && _port.postMessage({ search_trend: end_num + '&rarr;' + msg.search_result_count });
        } else if (end_num) {
          _port && _port.postMessage({ search_trend: '&equiv;' });
        }
      } else {
        localStorage.setItem(term_lower, digitals.join(','));
      }
    }
  } else if (msg.from_f1000) {
    tmp = msg.from_f1000.split(',');
    call_from_other_sites(tmp[0], sender_tab_id, tmp[1], tmp[2]);
  } else if (msg.from_sites_w_pmid) {
    call_from_other_sites(msg.from_sites_w_pmid, sender_tab_id);
  } else if (msg.from_popup_w_pmid) {
    call_from_other_sites(msg.from_popup_w_pmid, msg.popup_tabid);
  } else if (msg.from_sites_w_doi && localStorage.getItem('shark_download') === 'yes') {
    chrome.downloads.download({
      url: msg.from_sites_w_doi[1],
      filename: msg.from_sites_w_doi[0].replace(/\/+/g, '@') + '.pdf'
    }, function (id) {
      if (localStorage.getItem('shark_open_files') === 'yes') {
        chrome.downloads.open(id); //@@@@ user gesture
      } else {
        console.log(id, msg.from_sites_w_doi[0], msg.from_sites_w_doi[1]);
      }
    });
  } else if (msg.pageAbs) { // 2018-10-1
    localStorage.setItem('abs_' + msg.pmid, msg.pageAbs);
  } else if (msg.ajaxAbs) { // 2018-9-14
    pmid = msg.ajaxAbs;
    if (localStorage.getItem('abs_' + pmid)) {
      _port && _port.postMessage({ returnAbs: localStorage.getItem('abs_' + pmid), pmid: pmid });
    } else {
      args = { apikey: req_key, db: 'pubmed', id: pmid };
      if (ncbi_api) {
        args.ncbi_api = ncbi_api;
      }
      DEBUG && console.log('>> will entrezajax abstract for PMID:' + pmid);
      $.getJSON(base + '/entrezajax/efetch', args, function (d) {
        const l = d.result.PubmedArticle[0];
        if (l.MedlineCitation.Article.Abstract) {
          localStorage.setItem('abs_' + pmid, l.MedlineCitation.Article.Abstract.AbstractText);
          _port && _port.postMessage({ returnAbs: l.MedlineCitation.Article.Abstract.AbstractText, pmid: pmid });
        }
      }).fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus !== '503') {
          DEBUG && console.log('>> entrezajax abstract failed PMID:' + pmid);
        }
      });
    }
  } else if (msg.do_syncValues) {
    do_syncValues();
  } else if (msg.failed_term) { // @@@@
    const failed_terms = localStorage.getItem('failed_terms') || '';
    let failed_times = 0;
    if (failed_terms) {
      console.log(msg.failed_term, failed_terms);
      const failed_match = failed_terms.match(/","/g);
      if (failed_match) {
        failed_times = failed_match.length + 1;
      }
      if (failed_times % 5 === 3 && localStorage.getItem('rev_proxy') !== 'yes') {
        localStorage.setItem('rev_proxy', 'yes');
        localStorage.setItem('websocket_server', 'node.thepaperlink.cn:8081');
        base = 'https://www.thepaperlink.cn';
        localStorage.removeItem('https_failed'); // 2020-2-3
      }
      localStorage.setItem('failed_terms', failed_terms + ',"' + msg.failed_term + '"');
    } else {
      localStorage.setItem('failed_terms', '"' + msg.failed_term + '"');
    }
  } else if (msg.open_options || (msg.saveIt && !pubmeder_ok && !cloud_op)) {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html'),
      active: true
    });
  // } else if (msg.pmid && msg.shark) {
  //  do_download_shark(msg.pmid, msg.shark);
  } else if (msg.fetch_JCR) { // 2024-4-2
    if (msg.fetch_JCR && jcr_obj[ msg.fetch_JCR ]) {
      _port && _port.postMessage({ class_JCR:
        [msg.fetch_JCR, jcr_obj[ msg.fetch_JCR ] ]
      });
    }
  } else {
    console.log(msg);
  }
  // msg processed
}
chrome.runtime.onConnect.addListener(function (_port) {
  console.assert(_port.name === 'background_port');
  _port.onMessage.addListener(function (msg) {
    get_request(msg, _port);
  });
});
chrome.runtime.onMessageExternal.addListener(
  function (req, sender, sendResponse) {
    get_request(req, null);
    sendResponse({});
  }
);

if (localStorage.getItem('rev_proxy') === 'yes') {
  base = 'https://www.thepaperlink.cn';
  if (arbitrary_sec < 3) {
    arbitrary_sec = 3;
  }
} else {
  console.time('>> check google connection');
  $.ajax({
    url: 'https://www.thepaperlink.com/generate_200',
    dataType: 'text',
    timeout: 4000
  }).done(function () {
    console.log('>> direct access Google cloud');
  }).fail(function () {
    base = 'https://www.thepaperlink.cn';
    console.log('>> failed, switch to theServer Not-Google');
  }).always(function () {
    console.timeEnd('>> check google connection');
  });
}

if (localStorage.getItem('contextMenu_shown') !== 'no') {
  localStorage.setItem('contextMenu_on', 'yes');
  menu_generator();
}

function newdayRoutine () {
  console.log('>> a new day! housekeeping first ' + Math.random());
  let old_id = '';
  const init_found = localStorage.getItem('id_found') || '';
  for (i = 0, len = localStorage.length; i < len; i += 1) {
    aKey = localStorage.key(i);
    if (aKey && aKey.substr(0, 6) === 'tabId:') {
      aVal = localStorage.getItem(aKey);
      if (alldigi.test(aVal)) {
        if (aVal !== '999999999' && init_found.indexOf(aVal) === -1) {
          old_id += ' ' + aVal;
        }
        localStorage.removeItem(aKey);
      }
    } else if (aKey && aKey.substr(0, 6) === 'email_') {
      aVal = aKey.split('_');
      // @@@@
    } else if (aKey && aKey.substr(0, 7) === 'pubmed_') {
      aVal = aKey.split('_');
      localStorage.removeItem(aKey);
      saveIt_pubmeder(aVal[1]);
    }// else if (aKey && (aKey.substr(0,8) === 'scholar_' || aKey.substr(0,7) === 'scopus_')) {
    //  localStorage.removeItem(aKey);
    // }
  }
  if (old_id) {
    localStorage.setItem('id_found', init_found + ' ' + old_id);
  }
}
if (localStorage.getItem('last_chrome_open_str') !== date_str) {
  localStorage.setItem('last_chrome_open_str', date_str);
  newdayRoutine();
}
setInterval(newdayRoutine, 24 * 60 * 60 * 60);

$(document).ready(function () {
  if (!broadcast_loaded && localStorage.getItem('ws_items') === 'yes') {
    load_broadcast();
    get_server_data(0);
  }
});

function adjustStorage (rst, newOnly) {
  let toRemove = [];
  for (aKey in rst) {
    if (aKey.indexOf('pmid_') === 0) {
      const a_pmid = aKey.substr(5, aKey.length - 5);
      let pmidObj = rst[aKey];
      if (newOnly) { pmidObj = rst[aKey].newValue; }
      for (aVal in pmidObj) {
        DEBUG && console.log(aVal + '_' + a_pmid, '' + pmidObj[aVal]);
        localStorage.setItem(aVal + '_' + a_pmid, '' + pmidObj[aVal]);
      }
    } else if (aKey.indexOf('tabId:') === 0 ||
        rst[aKey] === undefined || rst[aKey] === null) {
      toRemove.push(aKey);
    } else if (aKey.indexOf('diff_') === 0) { // 2022-4-24
      toRemove.push(aKey);
    } else if (aKey && newOnly && rst[aKey].newValue) {
      localStorage.setItem(aKey, '' + rst[aKey].newValue);
    } else if (aKey && rst[aKey]) {
      localStorage.setItem(aKey, '' + rst[aKey]);
    }
  }
  if (toRemove.length) {
    chrome.storage.sync.remove(toRemove);
  }
}

function do_syncValues () {
  console.time('>> get entire storage.sync');
  chrome.storage.sync.get(null, function (rslt) { // the entire
    console.timeEnd('>> get entire storage.sync');
    if (!rslt) {
      console.log('Empty: syncValues stopped');
      return;
    }
    adjustStorage(rslt);
  });
}

chrome.runtime.onInstalled.addListener(function () {
  // 2018-9-27
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.ncbi.nlm.nih.gov/pubmed' } })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }, {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//pubmed.ncbi.nlm.nih.gov/' } })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }, {
      //        conditions: [
      //            new chrome.declarativeContent.PageStateMatcher({
      //                pageUrl: { urlContains: '//pubmed.cn/' },
      //                css: [ "p[class='pmid']" ] }),
      //            new chrome.declarativeContent.PageStateMatcher({
      //                pageUrl: { urlContains: '//or.nsfc.gov.cn/handle/' } })
      //        ],
      //        actions: [
      //            new chrome.declarativeContent.RequestContentScript({js: ["jsClient.js"]}),
      //            new chrome.declarativeContent.ShowPageAction()
      //       ]
      //    }, {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { urlContains: '//pubmed.cn/' },
          css: ["p[class='view_pmid']"]
        }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//f1000.com/prime/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//facultyopinions.com/article/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//connect.h1.co/article/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.storkapp.me/paper/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.storkapp.me/pubpaper/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.biorxiv.org/content/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.medrxiv.org/content/' } }),
        // new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//ir.nsfc.gov.cn/paperDetail/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//journals.plos.org/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.sciencedirect.com/science/article/pii/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//elifesciences.org/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.nature.com/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.cell.com/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.sciencemag.org/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.rupress.org/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.biologists.org/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.embopress.org/' } })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }
    ]);
  });

  // sync core values
  do_syncValues();
}); // onInstalled

chrome.storage.onChanged.addListener(function (rst, areaName) {
  if (areaName === 'sync') {
    if (localStorage.getItem('justDid_load_common_values')) {
      localStorage.removeItem('justDid_load_common_values');
    } else {
      adjustStorage(rst, 1);
    }
  } else {
    let a; let b;
    for (aKey in rst) {
      a = rst[aKey].oldValue;
      b = rst[aKey].newValue;
      if (a && a.date_str) {
        a.date_str = undefined;
        b.date_str = undefined;
      }
      //if (a && JSON.stringify(a)) {
      //  localStorage.setItem('diff_' + aKey, date_str);
      //}
    }
  }
});

chrome.omnibox.onInputChanged.addListener(
  function (text, suggest) {
    suggest([
      { content: text + '&pdf_only=on', description: 'only search articles with valid PDF' },
      { content: text + '&reviews_only=on', description: 'only research reviews in PubMed' }
    ]);
  });

chrome.omnibox.onInputEntered.addListener(
  function (text) {
    const newURL = base + '?q=' + text;
    chrome.tabs.create({ url: newURL });
  });
