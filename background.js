"use strict";

var DEBUG = false,
    i, len, aKey, aVal, ws, ws_timer,
    ws_addr = localStorage.getItem('websocket_server') || 'node.thepaperlink.com:8081',
    uid = localStorage.getItem('ip_time_uid') || null,
    scholar_count = 0,
    scholar_run = 0,
    scholar_queue = [],
    scholar_no_more = 0,
    scholar_page_open_limits = 3,
    shark_limits = localStorage.getItem('shark_limit') || 3,
    loading_theServer = false,
    load_try = 10,
    local_ip = '',
    new_tabId = null,
    alldigi = /^\d+$/,
    old_id = '',
    dd = document,
    init_found = localStorage.getItem('id_found') || '',
    base = 'https://pubget-hrd.appspot.com',
    guest_apikey = null,
    apikey, req_key, pubmeder_apikey, pubmeder_email,
    local_mirror,
    ezproxy_prefix,
    pubmeder_ok = false,
    broadcast_loaded = false,
    extension_load_date = new Date(),
    date_str = 'day_' + extension_load_date.getFullYear() +
        '_' + (extension_load_date.getMonth() + 1) +
        '_' + extension_load_date.getDate(),
    last_date = localStorage.getItem('last_date_str') || '';

function ez_format_link(prefix, url){
  if (!prefix) return url;
  if (prefix.substr(0,1) === '.') {
    var i, ss = '', s = url.split('/');
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

function get_ymd() {
  var d = new Date();
  return [d.getFullYear(), (d.getMonth() + 1), d.getDate()];
}

function get_end_num(str) {
  var suffix = ',';
  if (!str) { return 0; }
  try {
    return parseInt(str.substr(str.lastIndexOf(suffix) + 1), 10);
  } catch (err) {
    DEBUG && console.log('>> get_end_num: ' + err);
    return 0;
  }
}

function post_theServer(v) {
  console.time("Call theServer for values");
  var a = [], version = 'Chrome_v2.9';
  a[0] = 'WEBSOCKET_SERVER';
  a[1] = 'GUEST_APIKEY';
  if (!local_ip) {
    return;
  }
  $.post('https://www.zhaowenxian.com/',
      {'pmid':'1', 'title':a[v], 'ip':local_ip, 'a':version},
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
            localStorage.setItem('alert_outdated', 1);
          } else if (version === d.chrome) {
            localStorage.removeItem('alert_outdated');
          }
        } else {
          console.log('__ empty from www.zhaowenxian.com');
        }
      }, 'json'
  ).fail(function () {
    DEBUG && console.log('>> post_theServer, error');
  }).always(function() {
    loading_theServer = false;
    console.timeEnd("Call theServer for values");
  });
}

function get_local_ip() {
  console.time("Call theServer for local IP");
  return $.getJSON('http://node.thepaperlink.com:8089/', function (d) {
    local_ip = d['x-forwarded-for'];
    if (local_ip && local_ip.substr(0,7) === '::ffff:') {
      local_ip = local_ip.split('::ffff:')[1];
    }
    if (local_ip && !uid) {
      uid = local_ip + ':';
      uid += extension_load_date.getTime();
      localStorage.setItem('ip_time_uid', uid);
    }
    DEBUG && console.log('>> get_local_ip: ' + local_ip);
  }).fail(function() {
    DEBUG && console.log('>> get_local_ip error');
  }).always(function() {
    console.timeEnd("Call theServer for local IP");
  });
}

function get_server_data(v) {
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

function load_common_values() {
  apikey = localStorage.getItem('thepaperlink_apikey') || null;
  req_key = apikey;
  if (req_key === null) {
    req_key = guest_apikey;
    if (req_key === null && load_try > -4 && window.navigator.onLine) {
      load_try -= 1;
      get_server_data(1);
      setTimeout(load_common_values, 5000);
      return;
    }
    localStorage.removeItem('mendeley_status');
    localStorage.removeItem('facebook_status');
    localStorage.removeItem('dropbox_status');
    localStorage.removeItem('douban_status');
    localStorage.removeItem('googledrive_status');
    localStorage.removeItem('skydrive_status');
    localStorage.removeItem('baiduyun_status');
  }
  pubmeder_apikey = localStorage.getItem('pubmeder_apikey') || null;
  pubmeder_email = localStorage.getItem('pubmeder_email') || null;
  pubmeder_ok = !!(pubmeder_apikey !== null && pubmeder_email !== null); // 2015-12-9: !!expr returns a Boolean value (true or false)
  if (localStorage.getItem('scholar_once') !== 'no') {
    scholar_page_open_limits = 1;
  } else {
    scholar_no_more = 0;
  }
  local_mirror = localStorage.getItem('local_mirror') || '127.0.0.1';
  ezproxy_prefix = localStorage.getItem('ezproxy_prefix') || '';
}
console.time("Load common values");
load_common_values();
console.timeEnd("Load common values");

function open_new_tab(url, winId, idx) {
  var tab_obj = {url: url, active: true};
  if (winId) {
    tab_obj['windowId'] = winId;
  }
  if (idx) {
    tab_obj['index'] = idx;
  }
  DEBUG && console.log('tab_obj', tab_obj);
  chrome.tabs.create(tab_obj, function (tab) {
    new_tabId = tab.id;
    DEBUG && console.log('>> a new tab for you, #' + new_tabId);
  });
}

function generic_on_click(info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  open_new_tab(base, tab.windowId, tab.index);
}

function select_on_click(info, tab) {
  var url = base;
  if ( alldigi.test(info.selectionText) ) {
    url += '/:' + info.selectionText;
  } else {
    url += '/?q=' + info.selectionText;
  }
  if (localStorage.getItem('new_tab') === 'no') {
    chrome.tabs.update({url: url, active: true});
  } else {
    open_new_tab(url, tab.windowId, tab.index);
  }
}

function b_proxy(tab_id, _data) { // process ws action
  chrome.tabs.sendMessage(tab_id, _data);
}

function p_proxy(_port, _data) {
  _port.postMessage(_data);
}

//function call_js_on_click(info, tab) {
//  DEBUG && console.log('call_js_on_click', info);
//  b_proxy(tab.id, {js_key: req_key, js_base: base + '/'});
//}

function menu_generator() {
  chrome.contextMenus.removeAll();
  chrome.contextMenus.create({'title': 'search the paper link for \'%s\'',
    'contexts':['selection'], 'onclick': select_on_click});
  //chrome.contextMenus.create({'title': 'find ID on this page',
  //  'contexts':['page'], 'onclick': call_js_on_click});
  chrome.contextMenus.create({'title': 'Visit our website',
    'contexts':['page'], 'onclick': generic_on_click}); // , 'link', 'editable', 'image', 'video', 'audio'
  chrome.contextMenus.create({'type': 'separator',
    'contexts':['page']});
  chrome.contextMenus.create({'title': 'extension Options', 'contexts':['page'],
    'onclick': function () {
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.extension.getURL('options.html'),
          active: true
        });
      });
    } });
  chrome.contextMenus.create({'title': 'Inspect logs', 'contexts':['page'],
    'onclick': function () {
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.extension.getURL('background.html'),
          active: true
        });
      });
    } });
}

function save_visited_ID(new_id) {
  if (!new_id || new_id === '999999999') {
    return;
  }
  var id_found = localStorage.getItem('id_found') || '';
  if (id_found.indexOf(new_id) === -1) {
    localStorage.setItem('id_found', id_found + ' ' + new_id);
  }
  if (id_found && id_found.split(' ').length > 11) {
    saveIt_pubmeder( localStorage.getItem('id_found').replace(/\s+/g, ',') );
  }
}

function saveIt_pubmeder(pmid) {
  if (!pubmeder_ok) {
    DEBUG && console.log('>> no valid pubmeder credit');
    return;
  }
  var args = {'apikey' : pubmeder_apikey,
        'email' : pubmeder_email,
        'pmid' : pmid},
      url = 'https://pubmeder-hrd.appspot.com/input';
  if (localStorage.getItem('rev_proxy') === 'yes') {
    url = 'https://1.zhaowenxian.com/input';
  } else if (localStorage.getItem('https_failed')) {
    url = 'http://pubmeder.cailiang.net/input';
  }
  $.getJSON(url, args, function (d) {
    if (d.respond > 1) {
      var pre_history = localStorage.getItem('id_history') || '';
      pre_history.replace( /^,+|,+$/g, '' );
      pre_history += ',' + pmid;
      localStorage.setItem('id_history', pre_history);
      localStorage.setItem('id_found', '');
    }
  }).fail(function () {
    var date = new Date();
    localStorage.setItem('pubmed_' + pmid, date.getTime());
  });
}

function eSearch(search_term, tabId) {
  var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&term=' + search_term;
  console.time("data directly from eUtils");
  $.get(url,
      function (xml) {
        var pmid = $(xml).find('Id');
        if (pmid.length === 1) {
          localStorage.setItem('tabId:' + tabId.toString(), pmid.text());
          save_visited_ID( pmid.text() );
        }
      }, 'xml'
  ).fail(function () {
    DEBUG && console.log('>> eSearch failed, do nothing');
  }).always(function () {
    console.timeEnd("data directly from eUtils");
  });
}

function email_abstract(a, b) {
  var aKey = 'email_' + a + '_' + b,
      cc_address = localStorage.getItem('cc_address') || '';
  $.post(base + '/',
      {'apikey': a, 'pmid': b, 'action': 'email', 'cc': cc_address},
      function (d) {
        DEBUG && console.log('>> post /, action email: ' + d);
        localStorage.removeItem(aKey);
      }, 'json'
  ).fail(function () {
    DEBUG && console.log('>> email failed, save for later');
    var date = new Date();
    localStorage.setItem(aKey, date.getTime());
  });
}

function send_binary(aB, pmid, upload, no_email) {
  try {
    var xhr = new XMLHttpRequest(),
        boundary = 'AJAX------------------------AJAX',
        contentType = "multipart/form-data; boundary=" + boundary,
        postHead = '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
            'Content-Type: application/octet-stream\r\n\r\n',
        postTail = '\r\n--' + boundary + '--',
        abView = new Uint8Array(aB),
        post_data = postHead;
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
        function byteValue(x) {
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
        DEBUG && console.log('>> email_pdf failed, just email the abstract');
        if (!no_email && apikey) {
          email_abstract(apikey, pmid);
        }
      }
    };
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.sendAsBinary(post_data);
  } catch (err) {
    DEBUG && console.log(err);
  }
}

function get_binary(file, pmid, upload, no_email) {
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

function dropbox_it(pmid, pdf, k) {
  $.get(
      base + '/file/new',
      {'apikey': k, 'no_email': 1},
      function (ul) {
        get_binary(pdf, pmid, ul, 1);
      },
      'text'
  ).fail(function () {
    DEBUG && console.log('>> dropbox_it failed: ' + pdf);
  });
}

function format_a_li(category, pmid, url, num) {
  if (!url && !num) { // Abstract:
    $('#'+category+'_').append('<li><textarea rows="3" cols="100">'+pmid+'</textarea></li>');
  } else {
    $('#'+category+'_').append('<li><button id="'+pmid+'">'+pmid+'</button> &nbsp; <a target="_blank" href="'+url+'">'+url+'</a></li>');
    $('#'+pmid).on('click', function () { eSS(this.id); });
    if (num) {
      $('#'+pmid).text(pmid + ' (' + num + ')');
    }
  }
  if ( $('#'+category+'_h2').hasClass('Off') ) {
    $('#'+category+'_h2').removeClass('Off');
  }
}

function queue_scholar_title() {
  setTimeout(
      do_scholar_title,
      1000*scholar_run + Math.floor(Math.random() * 10000)
  );
}

function do_scholar_title() {
  var pmid = scholar_queue[3*scholar_run],
      t = scholar_queue[3*scholar_run + 1],
      tabId = scholar_queue[3*scholar_run + 2];
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

function scholar_title(pmid, t, tabId) {
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
        var reg = /<a[^<]+>Cited by \d+<\/a>/,
            h = reg.exec(r),
            g_num = [], g_link = [];
        if (h && h.length) {
          DEBUG && console.log(h);
          g_num = />Cited by (\d+)</.exec(h[0]);
          g_link = /href="([^"]+)"/.exec(h[0]);
          if (g_num.length === 2 && g_link.length === 2) {
            localStorage.setItem('scholar_' + pmid, pmid + ',' + g_num[1] + ',' + g_link[1]);
            format_a_li('scholar', pmid, 'https://scholar.google.com' + g_link[1]);
            b_proxy(tabId, {
              g_scholar: 1, pmid: pmid, g_num: g_num[1], g_link: g_link[1]
            });
            $.post(base + '/',
                {'apikey': req_key, 'pmid': pmid, 'g_num': g_num[1], 'g_link': g_link[1]},
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
    if ( parseInt(localStorage.getItem(date_str), 10) < 1 ) {
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

function do_download_shark(pmid, url) {
  var id = localStorage.getItem('downloadId_' + pmid);
  if (id) {
    chrome.downloads.search({url: url},
        function (item) {
          DEBUG && console.log( 'filename', item[0].filename );
          if (localStorage.getItem('shark_open_files') === 'yes') {
            chrome.tabs.create({
              url: 'file://' + item[0].filename,
              active: false
            }); }
        } );
  } else {
    chrome.downloads.download(
        {url: url, filename: 'pmid_' + pmid + '.pdf', method: 'GET'},
        function (id) {
          localStorage.setItem('downloadId_' + pmid, id);
          DEBUG && console.log('downloadId', id);
          if (localStorage.getItem('shark_open_files') === 'yes') {
            chrome.downloads.open(id);
          }
        } );
    if (apikey && localStorage.getItem('rev_proxy') !== 'yes' && localStorage.getItem('dropbox_status') === 'success') {
      dropbox_it(pmid, url, apikey);
    }
  }
}

function prepare_download_shark(tabId, pmid, args) {
  localStorage.setItem('shark_' + pmid, pmid + ',' + args.shark_link);
  format_a_li('shark', pmid, args.shark_link);
  b_proxy(tabId, {el_id: '_shark' + pmid, el_data: args.shark_link});
  $.post(base + '/', args,
      function (d) {
        DEBUG && console.log('>> post shark_link (empty is a success): ' + d);
      }, 'json'
  );
  if (localStorage.getItem('shark_download') === 'yes') {
    do_download_shark(pmid, args.shark_link);
  }
}

function parse_shark(pmid, url, tabId) {
  DEBUG && console.log(pmid, url, tabId);
  return false;
  // @@@@ No 'Access-Control-Allow-Origin' header
  var in_mem = localStorage.getItem('shark_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    b_proxy(tabId, {el_id: '_shark' + pmid, el_data: in_mem[1]});
    if (localStorage.getItem('shark_download') === 'yes') {
      do_download_shark(pmid, in_mem[1]);
    }
    return;
  }
  if (shark_limits <= 0) {
    return;
  }
  shark_limits -= 1;
  b_proxy(tabId, {el_id: '_shark' + pmid, el_data: 1});
  var reg = /iframe src\s*=\s*"(\S+)"/i, h,
      args = {'apikey': req_key, 'pmid': pmid, 'shark_link': ''};
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

function parse_pii(pmid, url, tabId) {
  DEBUG && console.log(pmid, url, tabId);
  return false;
  // @@@@ No 'Access-Control-Allow-Origin' header
  var in_mem = localStorage.getItem('url_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    b_proxy(tabId, {el_id: '_pdf' + pmid, el_data: in_mem[1]});
    in_mem = localStorage.getItem('scopus_' + pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 2);
      b_proxy(tabId, {el_id: 'pl4_scopus' + pmid, el_data: in_mem[1]});
    }
    return;
  }
  b_proxy(tabId, {el_id: '_pdf' + pmid, el_data: 1});
  $.get(url,
      function (r) {
        var reg = /href="([^"]+)" target="newPdfWin"/,
            reg2 = /Cited by in Scopus \((\d+)\)/i,
            h = reg.exec(r),
            h2 = reg2.exec(r),
            args;
        if (h && h.length) {
          DEBUG && console.log(h);
          args = {'apikey': req_key, 'pmid': pmid, 'pii_link': h[1]};
          if (h2 && h2.length) {
            DEBUG && console.log(h2);
            args.scopus_n = h2[1];
            localStorage.setItem('scopus_' + pmid, pmid + ',' + h2[1]);
            b_proxy(tabId, {el_id: 'pl4_scopus' + pmid, el_data: h2[1]});
          }
          localStorage.setItem('url_' + pmid, pmid + ',' + h[1]);
          b_proxy(tabId, {el_id: '_pdf' + pmid, el_data: h[1]});
          $.post(base + '/', args,
              function (d) {
                DEBUG && console.log('>> post pii_link (empty is a success): ' + d);
              }, 'json'
          );
          return;
        }
        b_proxy(tabId, {el_id: '_pdf' + pmid, el_data: '://'});
      },
      'html'
  ).fail(function () {
    DEBUG && console.log('>> parse_pii failed, do nothing');
  });
}

function load_broadcast() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  if (!window.WebSocket) {
    return;
  } else if (!window.navigator.onLine) {
    console.log('__ it is very possible that you are off the Internet...');
    if (!ws_timer) {
      ws_timer = setInterval(load_broadcast, 1800*1000);
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
        chrome.tabs.query({active: true, currentWindow: true},
            function (tabs) { // current tab and window, not perfect
              if (d.action === 'title') {
                scholar_title(d.pmid, d.title, tabs[0].id);
              } else if (d.action === 'url') {
                parse_pii(d.pmid, d.url, tabs[0].id);
              } else if (d.action === 'pdfLink_quick') {
                b_proxy(tabs[0].id, {el_id: 'pdfLink_quick', el_data: d.pdfLink_quick});
              }
            });
        if (d.action === 'dropbox_it' && d.pdf.substr(0,7).toLowerCase() === 'http://') {
          dropbox_it(d.pmid, d.pdf, d.apikey);
        }
      }
    } catch (err) {
      DEBUG && console.log('>> json parse error: ' + message.data);
    }
  };
}

function reLoad_options() {
  var urlOp = chrome.extension.getURL('options.html');
  chrome.tabs.query({url: urlOp}, function (tabs) {
    for (i = 0, len = tabs.length; i < len; i += 1) {
      chrome.tabs.update(tabs[i].id, {url: urlOp});
    }
  });
}

function common_dThree(itemZero, withRed) {
  var tmp, extra = '';
  if (itemZero.slfo && itemZero.slfo !== '~' && parseFloat(itemZero.slfo) > 0) {
      tmp = '<span>impact&nbsp;' + itemZero.slfo + '</span>';
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
          ez_format_link(ezproxy_prefix, 'http://f1000.com/' + itemZero.fid) +
          '" target="_blank">f1000&nbsp;star&nbsp;' + itemZero.f_v + '</a>';
      extra += tmp;
  }
  if (itemZero.doi && local_mirror) {
      tmp = '<a href="https://' + local_mirror +'/'+ itemZero.doi + '#" target="_blank">local</a>';
      extra += tmp;
  }
  return extra;
}

function get_request(msg, _port) {
  DEBUG && console.log(msg);
  var sender_tab_id = null,
      pmid, extra, tmp;
  if (_port && _port.sender) {
    sender_tab_id = _port.sender.tab.id;
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    base = 'https://www.zhaowenxian.com';
  } else if (localStorage.getItem('https_failed')) {
    base = 'http://www.thepaperlink.com';
  }
  // respond to msg
  if (msg.loadExtraJs) {
    p_proxy(_port, {js_base_uri:base});

  } else if (msg.load_local_) {
    p_proxy(_port, {local_mirror:local_mirror});

  } else if (msg.url) {
    var request_url = base + msg.url + req_key + '&runtime=' + chrome.runtime.id,
        cloud_op = '',
        m_status = localStorage.getItem('mendeley_status'),
        f_status = localStorage.getItem('facebook_status'),
        d_status = localStorage.getItem('dropbox_status'),
        b_status = localStorage.getItem('douban_status'),
        g_status = localStorage.getItem('googledrive_status'),
        s_status = localStorage.getItem('skydrive_status'),
        y_status = localStorage.getItem('baiduyun_status');
    if (m_status && m_status === 'success') {
      cloud_op += 'm';
    }
    if (f_status && f_status === 'success') {
      cloud_op += 'f';
    }
    if (d_status && d_status === 'success') {
      cloud_op += 'd';
    }
    if (b_status && b_status === 'success') {
      cloud_op += 'b';
    }
    if (g_status && g_status === 'success') {
      cloud_op += 'g';
    }
    if (s_status && s_status === 'success') {
      cloud_op += 's';
    }
    if (y_status && y_status === 'success') {
      cloud_op += 'y';
    }
    if (uid && uid !== 'unknown') {
      request_url += '&uid=' + uid;
    }
    DEBUG && console.time("call theServer for json");
    $.getJSON(request_url, function (d) {
      if (d && (d.count || d.error)) { // good or bad, both got json return
        p_proxy(_port,
            {r:d, tpl:apikey, pubmeder:pubmeder_ok, save_key:pubmeder_apikey, save_email:pubmeder_email,
              cloud_op:cloud_op, uri:base, p:ezproxy_prefix}
        );
      } else {
        if (apikey) {
          p_proxy(_port, {except:'JSON parse error.', tpl:apikey});
        } else {
          p_proxy(_port, {except:'Usage limits exceeded.', tpl:''});
        }
      }
    }).fail(function () {
      if (apikey) {
        p_proxy(_port, {except:'Data fetch error.', tpl:apikey});
      } else {
        p_proxy(_port, {except:'Guest usage limited.', tpl:''});
      }
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    }).always(function () {
      DEBUG && console.timeEnd("call theServer for json");
    });

  } else if (msg.save_apikey) {
    if (msg.save_email) {
      localStorage.setItem('pubmeder_apikey', msg.save_apikey);
      localStorage.setItem('pubmeder_email', msg.save_email);
      localStorage.setItem('b_apikey_gold', 1);
      pubmeder_apikey = msg.save_apikey;
      pubmeder_email = msg.save_email;
      pubmeder_ok = true;
    } else {
      localStorage.setItem('thepaperlink_apikey', msg.save_apikey);
      localStorage.setItem('a_apikey_gold', 1);
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
    if (localStorage.getItem('co_pubmed') !== 'no') {
      chrome.pageAction.show(sender_tab_id);
    } else {
      DEBUG && console.log('>> do nothing to sendID #' + msg.sendID);
    }
    localStorage.setItem('tabId:' + sender_tab_id.toString(), msg.sendID);
    if ( alldigi.test(msg.sendID) ) {
      save_visited_ID(msg.sendID);
    } else {
      eSearch(msg.sendID, sender_tab_id);
    }

  } else if (msg.menu_display) {
    if (localStorage.getItem('contextMenu_shown') !== 'no') {
      menu_generator();
      // just generated context menu
    } else {
      DEBUG && console.log('>> no need to update context menu');
    }

  } else if (msg.upload_url && msg.pdf && msg.pmid && apikey) {
    if (msg.pdf.substr(0,7).toLowerCase() === 'http://') {
      get_binary(msg.pdf, msg.pmid, msg.upload_url, msg.no_email);

    } else if (!msg.no_email) {
      email_abstract(apikey, msg.pmid);
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
    if (msg.save_cloud_op.indexOf('skydrive') > -1) {
      localStorage.setItem('skydrive_status', 'success');
    }
    if (msg.save_cloud_op.indexOf('baiduyun') > -1) {
      localStorage.setItem('baiduyun_status', 'success');
    }

  } else if (msg.t_cont) {
    var holder = dd.getElementById('clippy_t');
    holder.style.display = 'block';
    holder.value = msg.t_cont;
    holder.select();
    dd.execCommand('Copy');
    holder.style.display = 'none';

  } else if (msg.load_common_values) {
    load_common_values();

  } else if (msg.a_pmid && msg.a_title) {
    var in_mem = localStorage.getItem('scholar_' + msg.a_pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 3);
      p_proxy(_port, {
        g_scholar: 1, pmid: in_mem[0], g_num: in_mem[1], g_link: in_mem[2]
      });
    } else if (!scholar_no_more) {
      scholar_queue[3*scholar_count] = msg.a_pmid;
      scholar_queue[3*scholar_count + 1] = msg.a_title;
      scholar_queue[3*scholar_count + 2] = sender_tab_id;
      scholar_count += 1;
      queue_scholar_title();
    }

  } else if (msg.reset_counts) {
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
    if (localStorage.getItem('ajax_pii_link') !== 'no') {
      parse_pii(msg.pmid, 'http://linkinghub.elsevier.com/retrieve/pii/' + msg.pii, sender_tab_id);
    }
    if (localStorage.getItem('shark_link') !== 'no') {
      parse_shark(msg.pmid, 'https://'+local_mirror+'/retrieve/pii/'+msg.pii, sender_tab_id);
    }

  } else if (msg.doi_link && msg.doi && msg.pmid) {
    if (localStorage.getItem('shark_link') !== 'no') {
      parse_shark(msg.pmid, 'https://'+local_mirror+'/'+msg.doi, sender_tab_id);
    }

  } else if (msg.search_term) {
    if (msg.search_result_count && msg.search_result_count > 1) {
      var terms = localStorage.getItem('past_search_terms'),
          term_lower = msg.search_term.toLowerCase().
          replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' '),
          one_term_saved = localStorage.getItem(term_lower),
          end_num = get_end_num(one_term_saved),
          digitals = get_ymd();
      digitals.push(msg.search_result_count);
      if (!terms || terms.indexOf(term_lower) < 0) {
        if (!terms) { terms = ''; }
        terms += term_lower + '||';
        localStorage.setItem('past_search_terms', terms);
      }
      if (one_term_saved) {
        if (end_num && end_num !== msg.search_result_count) {
          localStorage.setItem(msg.search_term, one_term_saved + '||' + digitals.join(','));
          if (end_num > msg.search_result_count) {
            console.log('__ the search result count goes down: ' + msg.search_term);
            p_proxy(_port, {search_trend:'&darr;'});
          } else {
            p_proxy(_port, {search_trend:'&uarr;'});
          }
        } else {
          if (end_num) {
            p_proxy(_port, {search_trend:'&equiv;'});
          } }
      } else {
        localStorage.setItem(msg.search_term, digitals.join(','));
      }
    }

  } else if (msg.from_f1000) {
    var abc = msg.from_f1000.split(',');
    pmid = abc[0];
    extra = '';
    var fid = abc[1],
        f_v = abc[2],
        args = {'apikey': req_key, 'pmid': pmid, 'fid': fid, 'f_v': f_v};
    $.getJSON(base + '/api',
        {a: 'chrome3',
          pmid: pmid,
          apikey: req_key,
          runtime: '' + chrome.runtime.id}, function (d) {
          if (d && d.count === 1) {
            extra = common_dThree(d.item[0], 0);
            if (extra) {
              extra = ': ' + extra;
            }
            p_proxy(_port, {to_other_sites:'thepaperlink_bar', uri:base, pmid:pmid, extra:extra});
            if (!d.item[0].fid || (d.item[0].fid === fid && d.item[0].f_v !== f_v)) {
              $.post(base + '/', args,
                  function (d) {
                    DEBUG && console.log('>> post f1000 data (empty is a success): ' + d);
                  }, 'json'
              );
            }
          }
        }).fail(function () {
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    });

  } else if (msg.from_dxy) {
    pmid = msg.from_dxy;
    extra = '';
    $.getJSON(base + '/api',
        {a: 'chrome4',
          pmid: pmid,
          apikey: req_key,
          runtime: '' + chrome.runtime.id}, function (d) {
          if (d && d.count === 1) {
            extra = common_dThree(d.item[0], 1);
            if (extra) {
              extra = ': ' + extra;
            }
            p_proxy(_port, {to_other_sites:'thepaperlink_bar', uri:base, pmid:pmid, extra:extra});
          }
        }).fail(function () {
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    });

  } else if (msg.from_orNSFC) {
    var doi = msg.from_orNSFC;
    extra = '';
    $.getJSON(base + '/api',
        {a: 'chrome5',
          doi: doi,
          prjID: msg.prjID,
          apikey: req_key,
          runtime: '' + chrome.runtime.id}, function (d) {
          if (d && d.count === 1) {
            extra = common_dThree(d.item[0], 1);
            if (extra) {
              extra = ': ' + extra;
            }
            p_proxy(_port, {to_other_sites:'thepaperlink_bar', uri:base, pmid:pmid, extra:extra});
          }
        }).fail(function () {
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    });

  } else if (msg.from_storkapp) {
    var pmid = msg.from_storkapp;
    extra = '';
    $.getJSON(base + '/api',
        {a: 'chrome6',
          pmid: pmid,
          apikey: req_key,
          runtime: '' + chrome.runtime.id}, function (d) {
          if (d && d.count === 1) {
            extra = common_dThree(d.item[0], 1);
            if (extra) {
              extra = ': ' + extra;
            }
            p_proxy(_port, {to_other_sites:'thepaperlink_bar', uri:base, pmid:pmid, extra:extra});
          }
        }).fail(function () {
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    });

  } else if (msg.ajaxAbs) { // 2018-9-14
      var pmid = msg.ajaxAbs;
      if (localStorage.getItem('abs_'+pmid)) {
          p_proxy(_port, {returnAbs:localStorage.getItem('abs_'+pmid), pmid:pmid});
          return;
      } else {
          var args = {apikey: req_key, db: 'pubmed', id: pmid};
          DEBUG && console.log('>> will eFetch abstract for PMID:' + pmid);
          $.getJSON(base + '/entrezajax/efetch', args, function (d) {
              var l = d.result.PubmedArticle[0];
              if (l.MedlineCitation.Article.Abstract) {
                  localStorage.setItem('abs_'+pmid, l.MedlineCitation.Article.Abstract.AbstractText);
                  p_proxy(_port, {returnAbs:l.MedlineCitation.Article.Abstract.AbstractText, pmid:pmid});
              }
          }).fail(function () {
              DEBUG && console.log('>> eFetch abstract failed PMID:' + pmid);
          });
      }

  } else if (msg.alert_dev) {
    var failed_terms = localStorage.getItem('alert_dev') || '',
        failed_times = 0;
    if (failed_terms) {
      failed_times = ( failed_terms.match(/","/g) ).length + 1;
      if (failed_times % 5 === 3 && localStorage.getItem('rev_proxy') !== 'yes') {
        localStorage.setItem('rev_proxy', 'yes');
        base = 'https://www.zhaowenxian.com';
      }
      localStorage.setItem('alert_dev', failed_terms + ',"' + msg.alert_dev + '"')
    } else {
      localStorage.setItem('alert_dev', '"' + msg.alert_dev + '"')
    }

  } else if (msg.open_options) {
    chrome.tabs.create({
      url: chrome.extension.getURL('options.html'),
      active: true
    });

  //} else if (msg.pmid && msg.shark) {
  //  do_download_shark(msg.pmid, msg.shark);

  } else {
    console.log(msg);
  }
  // msg processed
}
//chrome.extension.onRequest.addListener(get_request);
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

console.time("Call theServer to validate connection");
if (localStorage.getItem('rev_proxy') === 'yes') {
  base = 'https://www.zhaowenxian.com';
} else if (localStorage.getItem('https_failed')) {
  base = 'http://www.thepaperlink.com';
}
$.ajax({
  url: 'https://pubget-hrd.appspot.com/static/humans.txt?force_reload=' + Math.random(),
  dataType: 'text',
  timeout: 4000
}).done(function() {
  DEBUG && console.log('>> access theServer via secure https');
  localStorage.removeItem('https_failed');
}).fail(function() {
  DEBUG && console.log('>> access theServer via http');
  localStorage.setItem('https_failed', 1);
  if (localStorage.getItem('rev_proxy') !== 'yes') {
    base = 'http://www.thepaperlink.com';
  }
}).always(function (){
  if (localStorage.getItem('contextMenu_shown') !== 'no') {
    localStorage.setItem('contextMenu_on', 1);
    menu_generator();
  }
  console.timeEnd("Call theServer to validate connection");
});

if (last_date !== date_str) {
  localStorage.setItem('last_date_str', date_str);
  DEBUG && console.log('>> a new day! start with some housekeeping tasks');
  for (i = 0, len = localStorage.length; i < len; i += 1) {
    aKey = localStorage.key(i);
    if (aKey && aKey.substr(0,6) === 'tabId:') {
      aVal = localStorage.getItem(aKey);
      if ( alldigi.test(aVal) ) {
        if (aVal !== '999999999' && init_found.indexOf(aVal) === -1) {
          old_id += ' ' + aVal;
        }
        localStorage.removeItem(aKey);
      }
    } else if (aKey && aKey.substr(0,6) === 'email_') {
      aVal = aKey.split('_');
      email_abstract(aVal[1], aVal[2]);
    } else if (aKey && aKey.substr(0,7) === 'pubmed_') {
      aVal = aKey.split('_');
      localStorage.removeItem(aKey);
      saveIt_pubmeder(aVal[1]);
    } else if (aKey && (aKey.substr(0,8) === 'scholar_' || aKey.substr(0,7) === 'scopus_')) {
      localStorage.removeItem(aKey);
    }
  }
}

if (old_id) {
  localStorage.setItem('id_found', init_found + ' ' + old_id);
}

$(document).ready(function () {
  $('#section_start_at').text(extension_load_date);
  $('#load_ALL').on('click', load_ALL_localStorage).text('load all local records');
  if (!broadcast_loaded && localStorage.getItem('ws_items') === 'yes') {
    load_broadcast();
    get_server_data(0);
  }
});

//// 2015-12-9
function load_ALL_localStorage() {
  var a_value, a_key, a_key_split, a_url;
  $('#email_').html('');
  $('#shark_').html('');
  $('#scholar_').html('');
  $('#abstract_').html('');
  $('#section_start_at').text('From THE TIME WHEN YOU INSTALL the paper link 3');
  for (i = 0; i < localStorage.length; i += 1) {
    a_key = localStorage.key(i);
    a_key_split = a_key.split('_');
    a_value = localStorage.getItem(a_key);
    if (a_value.indexOf('undefined') > -1) {
      $('#undefined_clean').append('<li>'+a_key+' : '+a_value+' &rarr; ACTION: REMOVE</li>');
      localStorage.removeItem(a_key);
      continue;
    }
    if ( ( a_key.indexOf('email_') === 0 ||
           a_key.indexOf('shark_') === 0 ||
           a_key.indexOf('scholar_') === 0 ) &&
         a_key_split[1] && a_value.indexOf(a_key_split[1]) === 0 ||
         a_key.indexOf('abs_') === 0 ) {
      if (a_key.indexOf('email_') === 0) {
        $('#'+a_key_split[0]+'_').append('<li>'+a_value+'</li>');
      } else if (a_key.indexOf('shark_') === 0) {
        a_url = a_value.split(',')[1];
        if (a_url.indexOf('googletagmanager.com') > 0) {
          $('#undefined_clean').append('<li>'+a_key+' : '+a_value+' &rarr; ACTION: REMOVE</li>');
          localStorage.removeItem(a_key);
          continue;
        }
        format_a_li('shark', a_key_split[1], a_url);
      } else if (a_key.indexOf('scholar_') === 0) {
        a_url = 'https://scholar.google.com' + a_value.split(',')[2];
        format_a_li('scholar', a_key_split[1], a_url, a_value.split(',')[1]);
      } else if (a_key.indexOf('abs_') === 0) {
        format_a_li('abstract', a_key_split[1]+' Abstract: '+a_value, null, null);
      }
    }
  }
  $('#load_ALL').text('re-load');
}