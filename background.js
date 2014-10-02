"use strict";

var DEBUG = false,
  i, len, aKey, aVal, ws, ws_timer,
  ws_addr = localStorage.getItem('websocket_server') || 'node.thepaperlink.com:8081',
  uid = localStorage.getItem('ip_time_uid') || null,
  scholar_count = 0,
  scholar_run = 0,
  scholar_queue = [],
  scholar_valid_page_open = false,
  loading_pl4me = false,
  load_try = 10,
  local_ip = '',
  new_tabId = null,
  alldigi = /^\d+$/,
  old_id = '',
  dd = document,
  init_found = localStorage.getItem('id_found') || '',
  guest_apikey = null,
  apikey, req_key, rev_proxy, base, pubmeder_apikey, pubmeder_email,
  pubmeder_ok = 0,
  broadcast_loaded = 0,
  ajax_pii_link = 1,
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

function post_pl4me(v) {
  var a = [], version = 'Chrome_v2.1.7';
  a[0] = 'WEBSOCKET_SERVER';
  a[1] = 'GUEST_APIKEY';
  if (!local_ip) {
    return;
  }
  $.post('http://0.cail.cn/',
    {'pmid':'1', 'title':a[v], 'ip':local_ip, 'a':version},
    function (d) {
      DEBUG && console.log('>> post_pl4me, ' + a[v]);
      DEBUG && console.log(d);
      if (d) {
        if (d.websocket_server) {
          localStorage.setItem('websocket_server', d.websocket_server);
          if (v === 0 && d.websocket_server !== ws_addr) {
            ws_addr = d.websocket_server;
            if (ws) {
              ws.close();
              broadcast_loaded = 0;
            }
            DEBUG && console.log('>> connect to the new ws server');
            load_broadcast();
          }
        }
        if (d.guest_apikey) {
          guest_apikey = d.guest_apikey;
        } else if (v !== 1 && apikey === null) {
          post_pl4me(1);
        }
        if (d.chrome && d.chrome !== version) {
          localStorage.setItem('alert_outdated', 1);
        } else if (version === d.chrome) {
          localStorage.removeItem('alert_outdated');
        }
      } else {
        console.log('__ empty from 0.cail.cn');
      }
    }, 'json'
  ).fail(function () {
    DEBUG && console.log('>> post_pl4me, error');
  }).always(function() {
    loading_pl4me = false;
  });
}

function get_local_ip() {
  return $.getJSON('http://node.thepaperlink.com:8089/', function (d) {
      local_ip = d['x-forwarded-for'];
      if (local_ip && !uid) {
        uid = local_ip + ':';
        uid += extension_load_date.getTime();
        localStorage.setItem('ip_time_uid', uid);
      }
      DEBUG && console.log('>> get_local_ip: ' + local_ip);
    }).fail(function() {
      DEBUG && console.log('>> get_local_ip error');
    });
}

function get_server_data(v) {
  if (!loading_pl4me) {
    loading_pl4me = true;
  } else {
    return;
  }
  var req;
  if (!local_ip) {
    req = get_local_ip();
  }
  if (req) {
    $.when(req).then(function () {
      post_pl4me(v);
    });
  } else {
    post_pl4me(v);
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
  rev_proxy = localStorage.getItem('rev_proxy');
  base = 'https://pubget-hrd.appspot.com';
  if (rev_proxy === 'yes') {
    base = 'http://www.zhaowenxian.com';
  } else if (localStorage.getItem('https_failed')) {
    base = 'http://www.thepaperlink.com';
  }
  pubmeder_apikey = localStorage.getItem('pubmeder_apikey') || null;
  pubmeder_email = localStorage.getItem('pubmeder_email') || null;
  if (pubmeder_apikey !== null && pubmeder_email !== null) {
    pubmeder_ok = 1;
  } else {
    pubmeder_ok = 0;
  }
  if (localStorage.getItem('ajax_pii_link') === 'no') {
    ajax_pii_link = 0;
  }
}
load_common_values();

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
  var url = base,
    new_tab = localStorage.getItem('new_tab');
  if ( alldigi.test(info.selectionText) ) {
    url += '/_' + info.selectionText;
  } else {
    url += '/?q=' + info.selectionText;
  }
  if (new_tabId && new_tab === 'no') {
    chrome.tabs.query({windowId: tab.windowID}, function (tabs) {
      for (i = 0, len = tabs.length; i < len; i += 1) {
        if (new_tabId === tabs[i].id) {
          chrome.tabs.update(new_tabId, {url: url, active: true});
          return;
        }
      }
      open_new_tab(url, tab.windowId);
    });
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

function call_js_on_click(info, tab) {
  b_proxy(tab.id, {js_key: req_key, js_base: base + '/'});
}

function menu_generator() {
  chrome.contextMenus.create({'title': 'search the paper link for \'%s\'',
    'contexts':['selection'], 'onclick': select_on_click});
  //chrome.contextMenus.create({'title': 'find ID on this page',
  //  'contexts':['page'], 'onclick': call_js_on_click});
  chrome.contextMenus.create({'title': 'visit the Paper Link',
    'contexts':['page'], 'onclick': generic_on_click}); // , 'link', 'editable', 'image', 'video', 'audio'
  chrome.contextMenus.create({'type': 'separator',
    'contexts':['page']});
  chrome.contextMenus.create({'title': 'Options', 'contexts':['page'],
    'onclick': function () {
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.create({
          index: tabs[0].index,
          url: chrome.extension.getURL('options.html'),
          active: true
        });
      });
  } });
}
if (localStorage.getItem('contextMenu_shown') !== 'no') {
  menu_generator();
  localStorage.setItem('contextMenu_on', 1);
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
  if (pubmeder_ok === 0) {
    DEBUG && console.log('>> no valid pubmeder credit');
    return;
  }
  var args = {'apikey' : pubmeder_apikey,
              'email' : pubmeder_email,
              'pmid' : pmid},
    url = 'https://pubmeder-hrd.appspot.com/input';
  if (rev_proxy === 'yes') {
    url = 'http://1.zhaowenxian.com/input';
  } else if (localStorage.getItem('https_failed')) {
    url = 'http://www.pubmeder.com/input';
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
  $.get(url,
    function (xml) {
      var pmid = $(xml).find('Id');
      if (pmid.length === 1) {
        localStorage.setItem('tabId:' + tabId.toString(), pmid.text());
        save_visited_ID( pmid.text() );
      }
    },
    'xml'
  ).fail(function () {
    DEBUG && console.log('>> eSearch failed, do nothing');
  });
}

function email_abstract(a, b) {
  var aKey = 'email_' + a + '_' + b;
  $.post(base + '/',
    {'apikey': a, 'pmid': b, 'action': 'email'},
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
      console.log('__ upload the file to the server with status: ' + xhr.status);
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

function reLoad_options() {
  var urlOp = chrome.extension.getURL('options.html');
  chrome.tabs.query({url: urlOp}, function (tabs) {
    for (i = 0, len = tabs.length; i < len; i += 1) {
      chrome.tabs.update(tabs[i].id, {url: urlOp});
    }
  });
}

function get_request(msg, _port) {
  DEBUG && console.log(msg);
  var sender_tab_id = null,
    ezproxy_prefix = localStorage.getItem('ezproxy_prefix') || '';
  if (_port && _port.sender) {
    sender_tab_id = _port.sender.tab.id;
  }
  // respond to msg
  if (msg.loadExtraJs) {
    p_proxy(_port, {js_base_uri:base});

  } else if (msg.url) {
    var request_url = base + msg.url + req_key,
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
    $.getJSON(request_url, function (d) {
      if (d && (d.count || d.error)) { // good or bad, both got json return
        p_proxy(_port,
          {r:d, tpl:apikey, pubmeder:pubmeder_ok, save_key:pubmeder_apikey, save_email:pubmeder_email,
            cloud_op:cloud_op, uri:base, p:ezproxy_prefix}
        );
      } else {
        p_proxy(_port, {except:1, tpl:apikey});
      }
    }).fail(function () {
      p_proxy(_port, {except:1, tpl:apikey});
      if (base === 'https://pubget-hrd.appspot.com') {
        localStorage.setItem('https_failed', 1);
        base = 'http://www.thepaperlink.com';
      }
    });

  } else if (msg.save_apikey) {
    if (msg.save_email) {
      localStorage.setItem('pubmeder_apikey', msg.save_apikey);
      localStorage.setItem('pubmeder_email', msg.save_email);
      localStorage.setItem('b_apikey_gold', 1);
      pubmeder_apikey = msg.save_apikey;
      pubmeder_email = msg.save_email;
      pubmeder_ok = 1;
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
    } else {
      scholar_queue[3*scholar_count] = msg.a_pmid;
      scholar_queue[3*scholar_count + 1] = msg.a_title;
      scholar_queue[3*scholar_count + 2] = sender_tab_id;
      scholar_count += 1;
      queue_scholar_title();
    }

  } else if (msg.reset_scholar_count) {
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];

  } else if (msg.load_broadcast) {
    broadcast_loaded = 0;
    if (ws) {
      ws.close();
    }
    load_broadcast();

  } else if (msg.pii_link && msg.pii && msg.pmid) {
    if (ajax_pii_link) {
      parse_url(msg.pmid, 'http://linkinghub.elsevier.com/retrieve/pii/' + msg.pii, sender_tab_id);
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
    var abc = msg.from_f1000.split(','),
      pmid = abc[0],
      fid = abc[1],
      f_v = abc[2],
      args = {'apikey': req_key, 'pmid': pmid, 'fid': fid, 'f_v': f_v},
      extra = '', tmp;
    $.getJSON(base + '/api?a=chrome3&pmid=' + pmid + '&apikey=' + req_key, function (d) {
      if (d && d.count === 1) {
        if (d.item[0].slfo && d.item[0].slfo !== '~' && parseFloat(d.item[0].slfo) > 0) {
          tmp = '<span>impact&nbsp;' + d.item[0].slfo + '</span>';
          extra += tmp;
        }
        if (d.item[0].pdf) {
          tmp = '<a class="thepaperlink-green" href="' +
            ez_format_link(ezproxy_prefix, d.item[0].pdf) +
            '" target="_blank">direct&nbsp;pdf</a>';
          extra += tmp;
        }
        if (extra) {
          extra = ': ' + extra;
        }
        p_proxy(_port, {to_other_sites:'article', uri:base, pmid:pmid, extra:extra});
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
    var pmid = msg.from_dxy,
      extra = '', tmp;
    $.getJSON(base + '/api?a=chrome4&pmid=' + pmid + '&apikey=' + req_key, function (d) {
      if (d && d.count === 1) {
        if (d.item[0].slfo && d.item[0].slfo !== '~' && parseFloat(d.item[0].slfo) > 0) {
          tmp = '<span>impact&nbsp;' + d.item[0].slfo + '</span>';
          extra += tmp;
        }
        if (d.item[0].pdf) {
          tmp = '<a class="thepaperlink-green" href="' +
            ez_format_link(ezproxy_prefix, d.item[0].pdf) +
            '" target="_blank">direct&nbsp;pdf</a>';
          extra += tmp;
        }
        if (d.item[0].f_v && d.item[0].fid) {
          tmp = '<a class="thepaperlink-red" href="' +
            ez_format_link(ezproxy_prefix, 'http://f1000.com/' + d.item[0].fid) +
            '" target="_blank">f1000&nbsp;star&nbsp;' + d.item[0].f_v + '</a>';
          extra += tmp;
        }
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

  } else if (msg.alert_dev) {
    var failed_terms = localStorage.getItem('alert_dev') || '',
        failed_times = 0;
    if (failed_terms) {
      failed_times = ( failed_terms.match(/","/g) ).length + 1;
      if (failed_times % 5 === 3 && rev_proxy !== 'yes') {
        rev_proxy = 'yes';
        localStorage.setItem('rev_proxy', 'yes');
        base = 'http://www.zhaowenxian.com';
      }
      localStorage.setItem('alert_dev', failed_terms + ',"' + msg.alert_dev + '"')
    } else {
      localStorage.setItem('alert_dev', '"' + msg.alert_dev + '"')
    }

  //} else if (msg.open_options) {
  //  open_new_tab( chrome.extension.getURL('options.html') );
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

$.ajax({
  url: 'https://pubget-hrd.appspot.com/static/humans.txt?force_reload=' + Math.random(),
  dataType: 'text',
  timeout: 4000
}).done(function() {
  DEBUG && console.log('>> access the server via secure https');
  localStorage.removeItem('https_failed');
}).fail(function() {
  DEBUG && console.log('>> access the server via http');
  localStorage.setItem('https_failed', 1);
  if (rev_proxy !== 'yes') {
    base = 'http://www.thepaperlink.com';
  }
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

////

function queue_scholar_title() {
  setTimeout(
    do_scholar_title,
    1000*scholar_run + Math.floor(Math.random() * 1000)
  );
}

function do_scholar_title() {
  var pmid = scholar_queue[3*scholar_run],
    t = scholar_queue[3*scholar_run + 1],
    tabId = scholar_queue[3*scholar_run + 2];
  scholar_run += 1;
  scholar_title(pmid, t, tabId);
  if (scholar_run === scholar_count) {
    DEBUG && console.log('>> self-reset scholar_count _run _queue');
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
  }
}

function parse_url(pmid, url, tabId) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('url', url);
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
    DEBUG && console.log('>> parse_url failed, do nothing');
  });
}

function scholar_title(pmid, t, tabId) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('title', t);
  var in_mem = localStorage.getItem('scholar_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 3);
    b_proxy(tabId, {
      g_scholar: 1, pmid: pmid, g_num: in_mem[1], g_link: in_mem[2]
    });
    return;
  }
  var url = 'http://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq=' +
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
    if (!scholar_valid_page_open) {
      open_new_tab('http://scholar.google.com/');
      scholar_valid_page_open = true;
    }
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
  ws = new WebSocket('ws://' + ws_addr);
  // ws.readyState: 0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSED

  ws.onopen = function () {
    DEBUG && console.log('>> ws is established');
    broadcast_loaded = 1;
    ws.send('{"apikey":"' + req_key + '"}');
  };

  ws.onclose = function () {
    if (broadcast_loaded === 1) {
      console.log('__ server comminucation lost, reconnecting...');
      if (load_try < 0) {
        DEBUG && console.log('>> ws is broken');
        broadcast_loaded = 0;
        return;
      }
      if (window.navigator.onLine) {
        load_try -= 1;
      }
      setTimeout(load_broadcast, 3000);
    } else {
      DEBUG && console.log('>> ws is closed');
    }
    return;
  };

  ws.onerror = function (err) {
    DEBUG && console.log('>> ws error: ' + err);
    return;
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
              parse_url(d.pmid, d.url, tabs[0].id);
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

$(document).ready(function () {
  if (!broadcast_loaded && localStorage.getItem('ws_items') === 'yes') {
    load_broadcast();
    get_server_data(0);
  }
});