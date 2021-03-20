'use strict';

var DEBUG = false;
var i; var len; var aKey; var aVal;
var ws; var ws_timer;
var ws_addr = localStorage.getItem('websocket_server') || 'node.thepaperlink.com:8081';
var uid = localStorage.getItem('ip_time_uid') || null;
var scholar_count = 0;
var scholar_run = 0;
var scholar_queue = [];
var scholar_no_more = 0;
var scholar_page_open_limits = 3;
var shark_limits = localStorage.getItem('shark_limit') || 3;
var loading_theServer = false;
var load_try = 10;
var local_ip = '';
var alldigi = /^\d+$/;
var dd = document;
var base = 'https://www.thepaperlink.com';
var guest_apikey = null;
var apikey; var req_key; var pubmeder_apikey; var pubmeder_email;
var local_mirror; var ezproxy_prefix; var cc_address;
var arbitrary_sec = 5;
var pubmeder_ok = false;
var cloud_op = '';
var broadcast_loaded = false;
var extension_load_date = new Date();
var date_str = 'day_' + extension_load_date.getFullYear() +
        '_' + (extension_load_date.getMonth() + 1) +
        '_' + extension_load_date.getDate();

function ez_format_link (prefix, url) {
  if (!prefix) {
    return url;
  } else if (prefix.substr(0, 1) === '.') {
    var ss = ''; var s = url.split('/');
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
  var d = new Date();
  return [d.getFullYear(), (d.getMonth() + 1), d.getDate()];
}

function get_end_num (str) {
  var suffix = ',';
  if (!str) { return 0; }
  try {
    return parseInt(str.substr(str.lastIndexOf(suffix) + 1), 10);
  } catch (err) {
    DEBUG && console.log('>> get_end_num: ' + err);
    return 0;
  }
}

function post_theServer (v) {
  console.time('Call theServer for values');
  var a = []; var version = 'Chrome_v2.9';
  a[0] = 'WEBSOCKET_SERVER';
  a[1] = 'GUEST_APIKEY';
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
  var req;
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
  pubmeder_ok = !!(pubmeder_apikey !== null && pubmeder_email !== null);
  cloud_op = '';
  var m_status = localStorage.getItem('mendeley_status');
  if (m_status && m_status === 'success') {
    cloud_op += 'm';
  }
  var f_status = localStorage.getItem('facebook_status');
  if (f_status && f_status === 'success') {
    cloud_op += 'f';
  }
  var d_status = localStorage.getItem('dropbox_status');
  if (d_status && d_status === 'success') {
    cloud_op += 'd';
  }
  var b_status = localStorage.getItem('douban_status');
  if (b_status && b_status === 'success') {
    cloud_op += 'b';
  }
  var g_status = localStorage.getItem('googledrive_status');
  if (g_status && g_status === 'success') {
    cloud_op += 'g';
  }
  var o_status = localStorage.getItem('onedrive_status');
  if (o_status && o_status === 'success') {
    cloud_op += 'o';
  }
  var y_status = localStorage.getItem('baiduyun_status');
  if (y_status && y_status === 'success') {
    cloud_op += 'y';
  }
  // 2015-12-9: !!expr returns a Boolean value (true or false)
  if (localStorage.getItem('scholar_once') !== 'no') {
    scholar_page_open_limits = 1;
  } else {
    scholar_no_more = 0;
  }
  local_mirror = localStorage.getItem('local_mirror') || '127.0.0.1';
  ezproxy_prefix = localStorage.getItem('ezproxy_prefix') || '';
  cc_address = localStorage.getItem('cc_address') || '';
  arbitrary_sec = localStorage.getItem('arbitrary_sec') || 5;
  if (newday === undefined) {
    var syncValues = {};
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
}
console.time('>> load common values');
load_common_values(1);
console.timeEnd('>> load common values');

function open_new_tab (url, winId, idx) {
  var tab_obj = { url: url, active: true };
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

function generic_on_click (info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  open_new_tab(base, tab.windowId, tab.index);
}

function js_on_click (info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  open_new_tab(base + '/js/', tab.windowId, tab.index);
}

function select_on_click (info, tab) {
  var url = base;
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
    title: 'Visit our website',
    contexts: ['page', 'selection'],
    onclick: generic_on_click
  }); // , 'link', 'editable', 'image', 'video', 'audio'
  chrome.contextMenus.create({
    title: 'extension Options',
    contexts: ['page', 'selection'],
    onclick: function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.extension.getURL('options.html'),
          active: true
        });
      });
    }
  });
  chrome.contextMenus.create({
    title: 'Stored search',
    contexts: ['page', 'selection'],
    onclick: function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.extension.getURL('history.html'),
          active: true
        });
      });
    }
  });
}

function save_visited_ID (new_id) {
  if (!new_id || new_id === '999999999') {
    return;
  }
  var id_found = localStorage.getItem('id_found') || '';
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
  var args = {
    apikey: pubmeder_apikey,
    email: pubmeder_email,
    pmid: pmid
  };
  var saveurl = 'https://0.thepaperlink.com/input'; // 2020-8-23
  if (localStorage.getItem('rev_proxy') === 'yes') {
    saveurl = 'https://0.thepaperlink.cn/input'; // 2020-8-23
  }
  $.getJSON(saveurl, args, function (d) {
    if (d.respond > 1) {
      var pre_history = localStorage.getItem('id_history') || '';
      pre_history.replace(/^,+|,+$/g, '');
      pre_history += ',' + pmid;
      localStorage.setItem('id_history', pre_history);
      localStorage.setItem('id_found', '');
    }
  }).fail(function () {
    var date = new Date();
    localStorage.setItem('pubmed_' + pmid, date.getTime());
  });
}

function eSearch (search_term, tabId) {
  var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&term=' + search_term;
  console.time('data directly from eUtils');
  $.get(url,
    function (xml) {
      var pmid = $(xml).find('Id');
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
    var xhr = new XMLHttpRequest();
    var boundary = 'AJAX------------------------AJAX';
    var contentType = 'multipart/form-data; boundary=' + boundary;
    var postHead = '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
            'Content-Type: application/octet-stream\r\n\r\n';
    var postTail = '\r\n--' + boundary + '--';
    var abView = new Uint8Array(aB);
    var post_data = postHead;
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
        var ords = Array.prototype.map.call(datastr, byteValue);
        var ui8a = new Uint8Array(ords);
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
          var date = new Date();
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
  var xhr = new XMLHttpRequest();
  xhr.open('GET', file, true);
  xhr.responseType = 'arraybuffer'; // Synchronous requests cannot have XMLHttpRequest.responseType set
  // 2013-2-13 'ArrayBufferViews' still error
  xhr.onload = function () {
    var aB = xhr.response; // not xhr.responseText
    if (aB) {
      send_binary(aB, pmid, upload, no_email);
    }
  };
  xhr.send(null);
}

function dropbox_it (pmid, pdf, k) {
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
  var pmid = scholar_queue[3 * scholar_run];
  var t = scholar_queue[3 * scholar_run + 1];
  var tabId = scholar_queue[3 * scholar_run + 2];
  scholar_run += 1;
  if (scholar_run === scholar_count) {
    DEBUG && console.log('>> self-reset scholar_count _run _queue');
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
  }
  DEBUG && console.log('call scholar_title() at', new Date());
  scholar_title(pmid, t, tabId);
}

function scholar_title (pmid, t, tabId) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('title', t);
  if (scholar_no_more) {
    b_proxy(tabId, {
      g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
    });
    return;
  }
  var url = 'https://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq=' +
      encodeURIComponent('"' + t + '"');
  b_proxy(tabId, {
    g_scholar: 1, pmid: pmid, g_num: 1, g_link: 1
  });
  $.get(url,
    function (r) {
      var reg = /<a[^<]+>Cited by \d+<\/a>/;
      var h = reg.exec(r);
      var g_num = []; var g_link = [];
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
  var id = localStorage.getItem('downloadId_' + pmid);
  if (id) {
    chrome.downloads.search({ url: url },
      function (item) {
        DEBUG && console.log('filename', item[0].filename);
        if (localStorage.getItem('shark_open_files') === 'yes') {
          chrome.tabs.create({
            url: 'file://' + item[0].filename,
            active: false
          });
        }
      });
  } else {
    chrome.downloads.download(
      { url: url, filename: 'pmid_' + pmid + '.pdf', method: 'GET' },
      function (id) {
        localStorage.setItem('downloadId_' + pmid, id);
        DEBUG && console.log('downloadId', id);
        if (localStorage.getItem('shark_open_files') === 'yes') {
          chrome.downloads.open(id);
        }
      });
    if (apikey && localStorage.getItem('rev_proxy') !== 'yes' && localStorage.getItem('dropbox_status') === 'success') {
      dropbox_it(pmid, url, apikey);
    }
  }
}

function prepare_download_shark (tabId, pmid, args) {
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
  // @@@@ blocked by CORS policy: No 'Access-Control-Allow-Origin' header
  var in_mem = localStorage.getItem('shark_' + pmid);
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
  var reg = /iframe\ src\s*=\s*"(\S+)"/i; var h;
  var args = { apikey: req_key, pmid: pmid, shark_link: '' };
  $.get(url,
    function (r) {
      h = reg.exec(r);
      if (h && h.length) {
        DEBUG && console.log(h);
        args.shark_link = h[1].split('#')[0];
        prepare_download_shark(tabId, pmid, args);
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
  return false; // blocked by CORS policy: No 'Access-Control-Allow-Origin' header
  var in_mem = localStorage.getItem('url_' + pmid);
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
      var reg = /href="([^"]+)" target="newPdfWin"/;
      var reg2 = /Cited by in Scopus \((\d+)\)/i;
      var h = reg.exec(r);
      var h2 = reg2.exec(r);
      var args;
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
      var d = JSON.parse(message.data);
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
  var urlOp = chrome.extension.getURL('options.html');
  chrome.tabs.query({ url: urlOp }, function (tabs) {
    for (aKey in tabs) {
      chrome.tabs.update(tabs[aKey].id, { url: urlOp });
    }
  });
}

function common_dThree (itemZero, withRed) {
  var tmp; var extra = '';
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
          ez_format_link(ezproxy_prefix, 'https://facultyopinions.com/prime/' + itemZero.fid) +
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
    var dd = ddd['tpl' + pmid];
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
        { a: 'chrome3', pmid: pmid, apikey: req_key, runtime: '' + chrome.runtime.id },
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
            if (fid && (!d.item[0].fid || (d.item[0].fid === fid && d.item[0].f_v !== f_v))) {
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
        }).fail(function () {
        base = 'https://www.thepaperlink.cn';
        console.log('call_from_other_sites fail: access theServer in Asia');
      });
    } // if chrome.storage.local.get
  });
}

function get_request (msg, _port) {
  // console.log(msg);
  var sender_tab_id = null;
  var pmid; var extra; var tmp; var args;
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
    var request_url = base + msg.url + req_key + '&runtime=' + chrome.runtime.id;
    if (uid && uid !== 'unknown') {
      request_url += '&uid=' + uid;
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
            p: ezproxy_prefix
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
    }).fail(function () {
      if (apikey) {
        _port && _port.postMessage({ except: 'Data fetch error.', tpl: apikey });
      } else {
        _port && _port.postMessage({ except: 'Guest usage limited. Fix by visit ' + base + '/reg', tpl: '' });
      }
      if (base === 'https://www.thepaperlink.com') {
        base = 'https://www.thepaperlink.cn';
        console.log('getJSON fail: access theServer in Asia');
      }
    }).always(function () {
      DEBUG && console.timeEnd('Call theServer api for json');
    });
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
    var post_action = '';
    var action_pmid = msg.money_emailIt || msg.money_reportWrongLink || msg.money_needInfo;
    if (msg.money_emailIt) {
      post_action = 'email';
      _port && _port.postMessage({ Off_id: 'thepaperlink_A' + action_pmid });
      if (msg.pdf) {
        console.log('@@@@ ' + msg.pdf);
      }
      if (apikey && ws && msg.doi) {
        ws.send('{"apikey":"' + apikey + '","doi":"' + msg.doi + '"}');
      }

      /* if (typeof window.email_pdf === 'undefined') {
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
      var date = new Date();
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
    var holder = dd.getElementById('clippy_t');
    holder.style.display = 'block';
    holder.value = msg.t_cont; // 2018-9-14 @@@@ so_noDate
    holder.select();
    dd.execCommand('Copy');
    holder.style.display = 'none';
  } else if (msg.load_common_values) {
    load_common_values();
  } else if (msg.a_pmid && msg.a_title) {
    var in_mem = localStorage.getItem('scholar_' + msg.a_pmid);
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
    if (localStorage.getItem('shark_link') !== 'no') {
      parse_shark(msg.pmid, 'https://' + local_mirror + '/retrieve/pii/' + msg.pii, sender_tab_id);
    }
  } else if (msg.doi_link && msg.doi && msg.pmid) {
    if (localStorage.getItem('shark_link') !== 'no') {
      parse_shark(msg.pmid, 'https://' + local_mirror + '/' + msg.doi, sender_tab_id);
    }
  } else if (msg.search_term) {
    if (msg.search_result_count && msg.search_result_count > 1) {
      var terms = localStorage.getItem('past_search_terms');
      var term_lower = msg.search_term.toLowerCase()
        .replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' ');
      var one_term_saved = localStorage.getItem(term_lower);
      var end_num = get_end_num(one_term_saved);
      var digitals = get_ymd();
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
  } else if (msg.pageAbs) { // 2018-10-1
    localStorage.setItem('abs_' + msg.pmid, msg.pageAbs);
  } else if (msg.ajaxAbs) { // 2018-9-14
    pmid = msg.ajaxAbs;
    if (localStorage.getItem('abs_' + pmid)) {
      _port && _port.postMessage({ returnAbs: localStorage.getItem('abs_' + pmid), pmid: pmid });
    } else {
      args = { apikey: req_key, db: 'pubmed', id: pmid };
      DEBUG && console.log('>> will entrezajax abstract for PMID:' + pmid);
      $.getJSON(base + '/entrezajax/efetch', args, function (d) {
        var l = d.result.PubmedArticle[0];
        if (l.MedlineCitation.Article.Abstract) {
          localStorage.setItem('abs_' + pmid, l.MedlineCitation.Article.Abstract.AbstractText);
          _port && _port.postMessage({ returnAbs: l.MedlineCitation.Article.Abstract.AbstractText, pmid: pmid });
        }
      }).fail(function () {
        DEBUG && console.log('>> entrezajax abstract failed PMID:' + pmid);
      });
    }
  } else if (msg.do_syncValues) {
    do_syncValues();
  } else if (msg.failed_term) {
    var failed_terms = localStorage.getItem('failed_terms') || '';
    var failed_times = 0;
    if (failed_terms) {
      console.log(failed_terms); // @@@@
      var failed_match = failed_terms.match(/","/g);
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
      url: chrome.extension.getURL('options.html'),
      active: true
    });

    // } else if (msg.pmid && msg.shark) {
    //  do_download_shark(msg.pmid, msg.shark);
  } else {
    console.log(msg);
  }
  // msg processed
}
// chrome.extension.onRequest.addListener(get_request);
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
  if (arbitrary_sec < 5) {
    arbitrary_sec = 5; // 2020-8-5
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
    console.log('>> failed, switch to theServer in Asia');
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
  var old_id = '';
  var init_found = localStorage.getItem('id_found') || '';
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
  var toRemove = [];
  for (aKey in rst) {
    if (aKey.indexOf('pmid_') === 0) {
      var a_pmid = aKey.substr(5, aKey.length - 5);
      var pmidObj = rst[aKey];
      var a_key;
      if (newOnly) { pmidObj = rst[aKey].newValue; }
      for (a_key in pmidObj) {
        DEBUG && console.log(a_key + '_' + a_pmid, '' + pmidObj[a_key]);
        localStorage.setItem(a_key + '_' + a_pmid, '' + pmidObj[a_key]);
      }
    } else if (aKey.indexOf('tabId:') === 0 ||
        rst[aKey] === undefined || rst[aKey] === null) {
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
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.ncbi.nlm.nih.gov/pubmed' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//pmlegacy.ncbi.nlm.nih.gov/' } })
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
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//facultyopinions.com/prime/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.storkapp.me/paper/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//www.storkapp.me/pubpaper/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.biorxiv.org/content/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '.medrxiv.org/content/' } }),
        new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: '//ir.nsfc.gov.cn/paperDetail/' } }),
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
    for (aKey in rst) {
      var a = rst[aKey].oldValue;
      var b = rst[aKey].newValue;
      if (a && a.date_str) {
        a.date_str = undefined;
        b.date_str = undefined;
      }
      if (a && JSON.stringify(a)) {
        localStorage.setItem('diff_' + aKey, date_str);
      }
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
    var newURL = base + '?q=' + text;
    chrome.tabs.create({ url: newURL });
  });
