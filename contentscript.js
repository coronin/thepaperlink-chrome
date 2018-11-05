"use strict";

/*
 * Copyright (c) 2013-2018 Liang Cai .  All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 *
 * http://about.me/cail
 *
 * this started as a UserScript for GreaseMonkey Firefox, http://userscripts.org/scripts/show/97865
 * the paper link 3:
 *   https://chrome.google.com/webstore/detail/obgkooamoiloecoadbfaflephiefbfpn
 */

var DEBUG = false,
    noRun = 0,
    page_d = document,
    page_url = page_d.URL,
    loading_gif = chrome.extension.getURL('loadingLine.gif'),
    clippy_file = chrome.extension.getURL('clippyIt.png'),
    _port = chrome.runtime.connect({name: 'background_port'}),
    pmidString = '',
    pmidArray = [],
    old_title = '',
    search_term = '',
    search_result_count = '',
    onePage_calls = 0,
    absNeeded = 0,
    local_mirror = '';

var thePaperLink_chrome_limited = true,
    limited = page_d.createElement('div');
limited.innerHTML = '<div id="thePaperLink_chrome_limited"></div>';
page_d.body.appendChild(limited);
// @@@@

if (typeof uneval === 'undefined') {
  var uneval = function (a) {
    return ( JSON.stringify(a) ) || '';
  };
}

function uneval_trim(a) {
  var b = uneval(a) || '""';
  return b.substr(1, b.length - 2);
}

function byTag(n) { return page_d.getElementsByTagName(n); }

function byID(d) { return page_d.getElementById(d); }

function trim(s) { return ( s || '' ).replace( /^\s+|\s+$/g, '' ); }

function a_proxy(d) {
  DEBUG && console.log('>> sendRequest to background.js');
  //chrome.extension.sendRequest(d);
  _port.postMessage(d);
}
a_proxy({load_local_mirror: 1});


function ez_format_link(p, url){
  if (!p) { return url; }
  if (p.substr(0,1) === '.') {
    var i, ss = '', s = url.split('/');
    for (i = 0; i < s.length; i += 1) {
      ss += s[i];
      if (i === 2) { ss += p; }
      ss += '/';
    }
    return ss;
  } else {
    return (p + url);
  }
}

function process_storkapp() { // 2018 Sep
  var i, len, ele, pmid = '';
  for (i = 0, len = byTag('a').length; i < len; i += 1) {
    ele = byTag('a')[i];
    if (ele.textContent.indexOf('ncbi.nlm.nih.gov/pubmed/') > 0) {
      pmid += parseInt(ele.textContent.split('ncbi.nlm.nih.gov/pubmed/')[1], 10);
      page_d.title = pmid; // ess.js
      a_proxy({from_nonF1000: pmid});
      ele.setAttribute('id', 'thepaperlink_bar');
      ele.innerHTML = '';
      ele.href = '#';
      ele.onclick = null;
      break;
    }
  }
  a_proxy({pageAbs: trim(byID('abstractHolder').textContent.split('  Copyright ')[0]),
           pmid: pmid});
}

function process_f1000() { // 2018 Sep
  var i, len, pmid = '', doi = '',
      f_v = 0,
      fid = parseInt(page_url.split('://f1000.com/prime/')[1], 10);
  for (i = 0; i < byTag('meta').length; i += 1) {
    if (byTag('meta')[i].getAttribute('name') === 'citation_pmid') {
      pmid += byTag('meta')[i].getAttribute('content');
    } else if (byTag('meta')[i].getAttribute('name') === 'citation_doi') {
      doi += byTag('meta')[i].getAttribute('content');
    }
  }
  for (i = 0, len = byTag('span').length; i < len; i += 1) {
    if (byTag('span')[i].className === 'recommendations-summary-count') {
      f_v = parseInt(byTag('span')[i].textContent, 10);
    } else if (byTag('span')[i].className === 'journalname') {
      byTag('span')[i].parentNode.setAttribute('id', 'thepaperlink_bar');
      byID('article-doi').style.display = 'none';
    }
  }
  if (pmid && f_v && fid) {
    page_d.title = pmid + '::' + doi; // ess.js
    a_proxy({from_f1000: pmid + ',' + fid + ',' + f_v});
  } else {
    DEBUG && console.log('>> process_f1000: '+pmid+','+fid+','+f_v);
  }
  a_proxy({pageAbs: trim(byID('abstract-tab-content').textContent.split(' PMID: ')[0]),
           pmid: pmid});
}

function order_gs() { // 2018 Oct
  var i, len, tobe = [], nodes = [],
      lists = byID('_thepaperlink_order_lists').textContent.split(';');
  if (byID('_thepaperlink_order_status').textContent === '0') {
    if (lists[1] === lists[0]) {
      tobe = lists[2].split(',');
      byID('_thepaperlink_order_status').textContent = '2';
    } else {
      tobe = lists[1].split(',');
      byID('_thepaperlink_order_status').textContent = '1';
    }
  } else if (byID('_thepaperlink_order_status').textContent === '1') {
    tobe = lists[2].split(',');
    byID('_thepaperlink_order_status').textContent = '2';
  } else {
    tobe = lists[0].split(',');
    byID('_thepaperlink_order_status').textContent = '0';
  }
  byID('gs_res_ccl_mid').style.display = 'none';
  for (i = 0, len = tobe.length; i < len; i += 1) {
    nodes.push( byID('_thepaperlink_' + tobe[i]) );
    byID('gs_res_ccl_mid').removeChild( byID('_thepaperlink_' + tobe[i]) );
  }
  for (i = 0, len = nodes.length; i < len; i += 1) {
    byID('gs_res_ccl_mid').insertBefore(nodes[i], undefined);
  }
  nodes = null;
  byID('gs_res_ccl_mid').style.display = 'block';
}

function process_googlescholar() { // 2018 Oct
  var i, ilen, tmp, nodes = byID('gs_res_ccl_mid').childNodes, a, b, c, d = [];
  for (i = 0, ilen = nodes.length; i < ilen; i += 1) {
    if (!nodes[i]) { continue; }
    a = nodes[i].textContent;
    if (!nodes[i].lastChild || !a) { continue; }
    if (a.indexOf(' Cited by ') < 0) {
      c = 0;
    } else {
      b = a.split(' Cited by ')[1];
      if (b.indexOf('Related article') < 0) {
        if ( /\d{1,5}\s+All\ \d/.test(b) ) {
          c = parseInt(b.split(' ')[0], 10);
        } else {
          DEBUG && console.log('>> ignored: ' + a);
          continue;
        }
      } else {
        c = parseInt(b.split('Related article')[0], 10);
      }
    }
    if (c) {
      nodes[i].setAttribute('id', '_thepaperlink_' + c);
      d.push(c);
    } else {
      byID('gs_res_ccl_mid').removeChild( nodes[i] );
    }
  }
  if (d.length > 0) {
    if (byID('_thepaperlink_cited_order')){
      byID('_thepaperlink_order_lists').textContent = d.join(',') + ';' +
          d.sort(function(u,v){return v-u;}).join(',') + ';' +
          d.sort(function(u,v){return u-v;}).join(',');
    } else {
      tmp = page_d.createElement('div');
      tmp.setAttribute('style', 'float:right;cursor:pointer;color:red');
      tmp.setAttribute('id', '_thepaperlink_cited_order');
      tmp.innerHTML = '&nbsp;&nbsp;<span id="_thepaperlink_order_gs">cited order ' +
          '<span id="_thepaperlink_order_status">0</span>&nbsp; <span style="background-color:yellow">' +
          '(0:original; 1:decreased; 2:increased)</span></span>' +
          '<span id="_thepaperlink_order_lists" style="display:none">' +
          d.join(',') + ';' +
          d.sort(function(u,v){return v-u;}).join(',') + ';' +
          d.sort(function(u,v){return u-v;}).join(',') + '</span>';
      // If compare function is not supplied, elements are sorted by converting them
      //  to strings and comparing strings in lexicographic order.
      byID('gs_ab_md').appendChild(tmp);
      byID('_thepaperlink_order_gs').onclick = function () { order_gs(); };
    }
  }
}

function process_pubmedTrending() {
  var i, ilen, trending = [],
      nodes = byID('ta_ad_title').parentNode.getElementsByTagName('a');
  for (i = 0, ilen = nodes.length; i < ilen; i += 1) {
    if (nodes[i].href.indexOf('/trending/') > -1) {
      continue
    } else if ( nodes[i].href.indexOf('/pubmed/') > -1 ) {
      trending.push( parseInt(nodes[i].href.split('pubmed/')[1], 10) );
    }
  }
  if (trending.length > 0) {
    a_proxy({sendID: trending});
  } else {
    chrome.storage.sync.get(['thepaperlink_apikey'], function (e) {
      if (e.thepaperlink_apikey) {
        alert_dev( e.thepaperlink_apikey );
    } });
  }
}

function parse_id(a) {
  var regpmid = /pmid\s*:?\s*(\d+)\s*/i,
      regdoi = /doi\s*:?\s*\d{2}\.\d{4,5}\//i,
      regpmc = /pmcid\s*:?\s*(PMC\d+)\s*/i,
      doipattern = /(\d{2}\.\d{4,5}\/[a-zA-Z0-9.\/)(\-]+\w)\s*\W?/,
      ID = null;
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
  } else if (regpmc.test(a)) {
    ID = regpmc.exec(a);
    ID[1] = ID[1].toUpperCase();
  } else if (regdoi.test(a) || doipattern.test(a)) {
    ID = doipattern.exec(a);
  }
  return ID;
}

function getPmid(zone, num) {
  var a = byTag(zone)[num].textContent,
      regpmid = /PMID:\s(\d+)\s/,
      ID, b, c, t_cont, t_strings, t_title, t_i;
  DEBUG && console.log(a);
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (byTag(zone)[num + 1].className.indexOf('rprtnum') > -1) {
        byTag(zone)[num + 2].setAttribute('id', ID[1]);
      } else { // abstract page
        byTag(zone)[num - 3].setAttribute('id', ID[1]);
      }
      if (byTag(zone)[num].className === 'rprt') {
        t_strings = byTag(zone)[num + 2].textContent.split('Related citations')[0].split('.');
        t_title = trim( t_strings[0] );
        t_cont = t_title +
            '.\r\n' + trim( t_strings[1].replace(/\d\./g, '.').replace(/\d,/g, ',') ) +
            '.\r\n' + trim( t_strings[2] ) + '. ';
        if ( t_strings[3].indexOf(';') > 0 ) {
          t_cont += trim( t_strings[3] ).replace(';', '; ') + '.';
        } else {
          for (t_i = 3; t_i < t_strings.length; t_i += 1) {
            if ( t_strings[t_i].indexOf('[Epub ahead') > -1 ) {
              break;
            }
            t_cont += trim( t_strings[t_i] ) + '.';
            if ( t_strings[t_i+1] && (
                    t_strings[t_i+1].substr(1,3) === 'pii' || t_strings[t_i+1].substr(1,3) === 'doi'
                ) ) {
              t_cont += ' ';
            }
          }
        }
        absNeeded = 1; // 2018 Sep
      } else { // abstract page
        t_strings = byTag(zone)[num+1].textContent.split('.');
        t_title = trim( byTag('h1')[1].textContent );
        t_cont = t_title +
            '\r\n' + trim( byTag(zone)[num+2].textContent.replace(/\d\./g, '.').replace(/\d,/g, ',') ) +
            '\r\n' + trim( t_strings[0] ) + '. ';
        if ( t_strings[1].indexOf(';') > 0 ) {
          t_cont += trim( t_strings[1] ).replace(';', '; ') + '.';
        } else {
          for (t_i = 1; t_i < t_strings.length; t_i += 1) {
            if ( t_strings[t_i].indexOf('Epub ') > -1 ) {
              break;
            }
            t_cont += trim( t_strings[t_i] ) + '.';
            if ( t_strings[t_i+1] && (
                    t_strings[t_i+1].substr(1,3) === 'pii' || t_strings[t_i+1].substr(1,3) === 'doi'
                ) ) {
              t_cont += ' ';
            }
          }
        }
      }
      t_cont += '  PMID:' + ID[1] + '\r\n';
      DEBUG && console.log(t_cont);
      b = page_d.createElement('div');
      b.innerHTML = '<div style="float:right;z-index:1;cursor:pointer">' +
          '<img class="pl4_clippy" title="copy to clipboard" src="' + clippy_file +
          '" alt="copy" width="14" height="14" />&nbsp;&nbsp;</div>';
      b.onclick = function () { a_proxy({t_cont: t_cont}); };
      if (byTag(zone)[num].className === 'rprt') {
        byTag(zone)[num + 3].appendChild(b);
      } else { // abstract page
        byTag(zone)[num + 1].appendChild(b);
        a_proxy({pageAbs: byTag(zone)[num + 8].textContent, pmid: ID[1]});
      }
      pmidString += ',' + ID[1];
      if (a.indexOf('- in process') < 0) {
        c = page_d.createElement('span');
        c.setAttribute('style', 'border-left:4px #fccccc solid;padding-left:4px;margin-left:4px;font-size:11px');
        c.innerHTML = '<span id="citedBy' + ID[1] + '">...</span>'; // @@@@ 'Access-Control-Allow-Origin' header is present on the requested resource.
        if (byTag(zone)[num].className === 'rprt') {
          byTag(zone)[num + 4].appendChild(c);
        } else { // abstract page
          byTag(zone)[num + 5].appendChild(c);
        }
        a_proxy({a_pmid: ID[1], a_title: t_title}); // queue_scholar_title
      }
    } // regpmid.exec(a)
  } // regpmid.test(a)
}

function get_Json(pmids) {
  var i, len, ele,
      need_insert = 1,
      url = '/api?flash=yes&a=chrome1&pmid=' + pmids,
      loading_span = '<span style="font-weight:normal;font-style:italic"> loading from "the paper link"</span>&nbsp;&nbsp;<img src="' + loading_gif + '" width="16" height="11" alt="loading" />';
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0, len = byTag('h3').length; i < len; i += 1) {
    ele = byTag('h3')[i];
    if (ele.className.indexOf('result_count') == 0) {
      need_insert = 0;
      ele.setAttribute('id', 'pl4_title');
      old_title = ele.innerHTML;
      if (search_term) {
        search_result_count = ele.textContent;
        if (search_result_count.indexOf(' of ') > 0) {
          search_result_count = parseInt(search_result_count.split(' of ')[1], 10);
        } else if (search_result_count.indexOf('Items: ') > -1) {
          search_result_count = parseInt(search_result_count.substr(7, search_result_count.length), 10);
        } else {
          search_result_count = 0;
        }
        a_proxy({search_term: search_term, search_result_count: search_result_count});
      }
      ele.innerHTML = old_title + loading_span;
      break;
    }
  }
  if (need_insert) {
    ele = page_d.createElement('h2');
    ele.innerHTML = loading_span;
    ele.setAttribute('id', 'pl4_title');
    byID('messagearea').appendChild(ele);
  }
  onePage_calls += 1;
  a_proxy({url: url}); // call theServer api
}

function run() {
  var i, len, z;
  try {
    search_term = byID('term').value; // 2013-3-26, 2018-9-14
  } catch (err) {
    DEBUG && console.log(err);
  }
  a_proxy({reset_counts: 1});
  for (i = 0, len = byTag('div').length; i < len; i += 1) {
    if (byTag('div')[i].className === 'rprt' || byTag('div')[i].className === 'rprt abstract') {
      getPmid('div', i);
    }
  }
  if (!search_term) {
    for (i = 0; i < byTag('meta').length; i += 1) {
      if (byTag('meta')[i].getAttribute('name') === 'ncbi_term') {
        search_term = byTag('meta')[i].getAttribute('content');
        break;
      }
    }
  }
  pmidString = pmidString.substr(1, pmidString.length);
  pmidArray = pmidString.split(',');
  if (pmidArray.length > 0) {
    a_proxy({sendID: pmidArray});
  }
  if (pmidString) {
    localStorage.setItem('thePaperLink_ID', pmidArray[0]);
    get_Json(pmidString);
  }
}

function alert_dev(req_key) {
  if (req_key) {
    var oXHR = new XMLHttpRequest();
    oXHR.open('POST', 'https://www.thepaperlink.com/?action=alert_dev&pmid=1&apikey=' + req_key, true);
    oXHR.onreadystatechange = function () {
      if (oXHR.readyState === 4) {
        if (oXHR.status === 200) {
          byID('thepaperlink_alert').innerHTML = '&lt;!&gt; Alert sent.';
        } else {
          DEBUG && console.log('Error', oXHR.statusText);
        }  }
    };
    setTimeout(function () {
      oXHR.abort();
    }, 60*1000); // 1-min timeout
    oXHR.send(null);
  } else {
    window.alert('\n you have to be a registered user to be able to alert the developer\n');
  }
}


if (page_url === 'https://www.thepaperlink.com/reg'
    || page_url === 'https://www.thepaperlink.com/settings'
    || page_url === 'http://www.thepaperlink.com/reg'
    || page_url === 'http://www.thepaperlink.com/settings'
    || page_url === 'https://www.thepaperlink.cn/settings'
    || page_url === 'https://www.thepaperlink.cn/reg'
    || page_url === 'http://www.thepaperlink.cn/settings'
    || page_url === 'http://www.thepaperlink.cn/reg') { // storage data for access the api server
  a_proxy({save_apikey: byID('apikey').innerHTML, save_email: null});
  a_proxy({save_cloud_op: byID('cloud_op').innerHTML});
  noRun = 2;
} else if (page_url.indexOf('://www.thepaperlink.com/oauth') > 0) {
  if ( byID('r_content') ) {
    var content = byID('r_content').innerHTML,
        service = byID('r_success').innerHTML;
    a_proxy({service: service, content: content});
  }
  noRun = 3;
} else if (page_url === 'http://pubmeder.cailiang.net/registration'
    || page_url === 'http://pubmeder-hrd.appspot.com/registration'
    || page_url === 'https://pubmeder-hrd.appspot.com/registration') { // storage data for access the bookmark server
  a_proxy({save_apikey: byID('apikey_pubmeder').innerHTML,
           save_email: byID('currentUser').innerHTML});
  noRun = 4;
} else if (page_url.indexOf('://f1000.com/prime/') > 0) {
  process_f1000();
  noRun = 30;
} else if (page_url.indexOf('://www.storkapp.me/paper/') > 0) {
  process_storkapp();
  noRun = 20;
} else if (page_url.indexOf('://scholar.google.com/scholar?') > 0) {
  process_googlescholar();
  noRun = 10;
} else if (page_url.indexOf('://www.ncbi.nlm.nih.gov/pubmed') === -1
        && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&') === -1
        && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez') === -1) { // content_scripts, externally_connectable
  var ID = parse_id(page_d.body.textContent) || parse_id(page_d.body.innerHTML);
  if (ID !== null && ID[1] !== '999999999') {
    DEBUG && console.log('>> other sites, got ID ' + ID[1]);
    a_proxy({sendID: ID[1]});
  }
  noRun = 1;
}
if (byID('ta_ad_title') && byID('ta_ad_title').textContent.indexOf(
    'records with recent increases') > 0) {
  process_pubmedTrending();
  noRun = 99;
}
if (byID('_thepaperlink_client_status')) { // noRun = 2
  byID('_thepaperlink_client_status').innerHTML = chrome.runtime.id;
}
if (byID('_thepaperlink_client_modify_it')) { // noRun = 2
  byID('_thepaperlink_client_modify_it').innerHTML = 'the browser you are using is good for that';
}
if (!noRun) {
  chrome.storage.sync.get(['rev_proxy', 'https_failed'], function (e) {
    var jss_base = 'https://www.thepaperlink.com/';
    if (e.https_failed || (e.rev_proxy && e.rev_proxy === 'yes')) {
      jss_base = 'https://www.thepaperlink.cn/';
    }
    if (!byID('paperlink2_display')) {
      var peaks = document.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      peaks.setAttribute('src', jss_base + '/jss?y=' + (Math.random()));
      page_d.body.appendChild(peaks);
    }
  });
  run(); // big boss
}

function get_request(msg) {
  DEBUG && console.log(msg);
  if (msg.local_mirror) {
    local_mirror = msg.local_mirror;
    //sendResponse({});
    return;

  } else if (msg.except) {
    if (!search_term) {
      search_term = page_url.split('/pubmed/')[1];
    }
    if (!search_term) {
      search_term = localStorage.getItem('thePaperLink_ID');
    } else {
      a_proxy({failed_term: search_term});
    }
    byID('pl4_title').innerHTML = old_title +
        ' <span style="font-size:12px;font-weight:normal;color:red;background-color:yellow;cursor:pointer" id="thepaperlink_alert">' +
        'Error!&nbsp;&nbsp;' + msg.except +
        '&nbsp;<a href="https://www.thepaperlink.com/?q=' + search_term +
        '" target="_blank">[?]</a></span>';
    byID('thepaperlink_alert').onclick = function () {
      var answer = confirm('\n do you want to alert the developer about this error?\n');
      if (answer) {
        alert_dev(msg.tpl);
      }
    };
    //sendResponse({});
    return;

  } else if (msg.js_key && msg.js_base) {
    // 2018-9-28: call_js_on_click via page_action
    //sendResponse({});
    return;

  } else if (msg.g_scholar) {
    if ( !byID('citedBy' + msg.pmid) ) { return 0; }
    try {
      if (msg.g_num === 1 && msg.g_link === 1) {
        byID('citedBy' + msg.pmid).innerText = 'trying';
      } else if (msg.g_num === 0 && msg.g_link === 0) {
        byID('citedBy' + msg.pmid).innerHTML = '<i>Really? No citation yet. Is it a very recent publication?</i>';
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          byID('citedBy' + msg.pmid).parentNode.setAttribute('class', 'thepaperlink_Off');
        }
      } else if (msg.g_num && msg.g_link) {
        byID('citedBy' + msg.pmid).innerHTML = '<a target="_blank" href="https://scholar.google.com' +
          msg.g_link + '">Google Scholar ' + msg.g_num + ' times</a>';
      }
    } catch (err) {
      DEBUG && console.log(err);
      byID('citedBy' + msg.pmid).parentNode.setAttribute('class', 'thepaperlink_Off');
    }
    //sendResponse({});
    return;

  } else if (msg.el_id && msg.el_data) { // _pdf, pl4_scopus, _shark
    try {
      if (msg.el_data && msg.el_data.indexOf('://') > -1) {
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          var e = byID('thepaperlink' + msg.el_id);
          if (msg.el_data === '://') {
            e.parentNode.removeChild(e);
          } else {
            e.removeClass('thepaperlink_Off');
            e.href = msg.el_data;
          }
        } else {
          byID(msg.el_id).innerHTML = '&raquo; <a target="_blank" href="' + msg.el_data + '">the file link</a>';
        }
      } else if (msg.el_data === 1 && page_url.indexOf('://www.ncbi.nlm.nih.gov/') === -1) {
        byID(msg.el_id).innerText = 'trying';
      } else {
        byID(msg.el_id).innerText = msg.el_data;
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
    //sendResponse({});
    return;

  } else if (msg.search_trend) { // from msg.search_term
    var hook = byID('myncbiusername').textContent;
    byID('myncbiusername').innerHTML = '<span style="color:yellow">&nbsp;' +
        msg.search_trend + '&nbsp;</span> ' + hook;
    byID('myncbiusername').style.display = 'inline';
    //sendResponse({});
    return;

  } else if (msg.returnAbs) { // 2018-9-14
    byID('thepaperlink_abs' + msg.pmid).textContent = 'abstract';
    alert(msg.returnAbs);
    if (byID('thepaperlink_text' + msg.pmid)) {
      byID('thepaperlink_text' + msg.pmid).style.display = 'block';
      byID('thepaperlink_text' + msg.pmid).value = msg.returnAbs;
    }
    localStorage.setItem('thePaperLink_ID', msg.pmid); // 2018-9-30
    //sendResponse({});
    return;
  }

  var p, pmid, div, div_html, tmp, i, j, k, insert_style, insert_span,
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal;cursor:pointer"> ',
      styles = '.thepaperlink {' +
          '  background: #e0ecf1;' +
          '  border:2px solid #dedede; border-top:2px solid #eee; border-left:2px solid #eee;' +
          '  padding: 2px 4px;' +
          '  border-radius: 4px;' +
          '  display: inline-block' +
          '}' +
          '.thepaperlink_Off {' +
          '  display: none !important' +
          '}' +
          '.thepaperlink > a ,' +
          '.thepaperlink > span {' +
          '  margin: 0 6px;' +
          '  text-decoration: none' +
          '}' +
          'a.thepaperlink-green {' +
          '  color: green' +
          '}' +
          'a.thepaperlink-red {' +
          '  color: red' +
          '}' +
          '.thepaperlink-home, .thepaperlink-abs {' +
          '  color: grey;' +
          '  cursor: pointer' +
          '}' +
          'img.pl4_clippy {' +
          '  opacity: 0.4' +
          '}' +
          'img.pl4_clippy:hover {' +
          '  opacity: 1.0' +
          '}' +
          '.thepaperlink span i, .thepaperlink a sup {' +
          '  background-color:yellow!important; border-radius:6px' +
          '}' +
          'textarea.thepaperlink-text {' +
          '  overflow:auto; padding-right:10px; outline:none; border:0; width:440px; height:200px; font-size:11px; color:grey; line-height:1.8; font-family:sans-serif' +
          '}',
      r = msg.r;

  if (msg.to_other_sites) { // respond to from_xx, style
    insert_style = page_d.createElement('style');
    insert_style.type = 'text/css';
    insert_style.appendChild(page_d.createTextNode(styles)); // WebKit hack
    page_d.body.appendChild(insert_style);
    div = page_d.createElement('div');
    div.className = 'thepaperlink';
    div_html = '<a class="thepaperlink-home" href="' + msg.uri + '/?q=pmid:' +
        msg.pmid + '" target="_blank">the paper link</a>';
    div_html += msg.extra;
    div.innerHTML = div_html;
    byID(msg.to_other_sites).appendChild(div);
    //sendResponse({});
    return;

  } else if (r && r.error) {
    byID('pl4_title').innerHTML = old_title +
        ' <span style="font-size:14px;font-weight:normal;color:red">"the paper link" error ' +
        uneval(r.error) + '</span>';
    //sendResponse({});
    return;

  } else if (!r || !r.count) {
    //sendResponse({});
    return;
  }

  p = uneval_trim(msg.p);
  if (!byID('css_loaded')) {
    insert_style = page_d.createElement('style');
    insert_style.type = 'text/css';
    insert_style.appendChild(page_d.createTextNode(styles));
    page_d.body.appendChild(insert_style);
    //GM_addStyle(styles);
  }
  if (msg.pubmeder) {
    bookmark_div += '<span id="thepaperlink_saveAll" onclick="saveIt_pubmeder(\'' +
        pmidString + '\',\'' + msg.save_key + '\',\'' + msg.save_email + '\')">save&nbsp;page</span></div>';
  } else {
    bookmark_div += 'save what you are reading? try <a href="http://pubmeder.cailiang.net/registration" target="_blank">PubMed-er</a></div>';
  }
  if (old_title) {
    byID('pl4_title').innerHTML = old_title + bookmark_div;
  } else {
    byID('pl4_title').innerHTML = '';
  }
  k = pmidArray.length;
  for (i = 0; i < r.count; i += 1) {
    pmid = uneval_trim(r.item[i].pmid);
    for (j = 0; j < k; j += 1) {
      if (pmid === pmidArray[j]) {
        pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
      }
    }
    if (byID('pl4_once_' + pmid)) {
      continue;
    }
    div = page_d.createElement('div');
    div.className = 'thepaperlink';
    div_html = '<a class="thepaperlink-home" id="pl4_once_' + pmid + '" href="' +
        msg.uri + '/?q=pmid:' + pmid + '" target="_blank">the paper link</a>: ';
    var slfoV = parseFloat(r.item[i].slfo);
    if (r.item[i].slfo && r.item[i].slfo !== '~' && slfoV > 0) {
      tmp = '<span>impact<i style="font-size:75%">' + uneval_trim(r.item[i].slfo) + '</i></span>';
      div_html += tmp;
    }
    if (absNeeded) { // 2018 Sep
      tmp = '<span class="thepaperlink-abs" id="thepaperlink_abs' + pmid + '">&nbsp;abs</span>';
      div_html += tmp;
    }
    if (r.item[i].pdf) {
      tmp = '<a id="thepaperlink_pdf' + pmid + '" class="thepaperlink-green" href="' +
          ez_format_link(p, uneval_trim(r.item[i].pdf)) + '" target="_blank">pdf</a>';
      div_html += tmp;
    } else if (r.item[i].pii) {
      a_proxy({pmid: pmid, pii: r.item[i].pii, pii_link: 1});
      tmp = '<a id="thepaperlink_pdf' + pmid + '" href="#" target="_blank" class="thepaperlink_Off">pdf</a>';
      div_html += tmp;
    }
    if (r.item[i].pmcid) {
      tmp = '<a id="thepaperlink_pmc' + pmid + '" href="https://www.ncbi.nlm.nih.gov/pmc/articles/' +
          uneval_trim(r.item[i].pmcid) + '/?tool=thepaperlink_chrome" target="_blank">pmc</a>';
      div_html += tmp;
    }
    if (r.item[i].doi) {
      a_proxy({pmid: pmid, doi: r.item[i].doi, doi_link: 1});
      tmp = '<a id="thepaperlink_doi' + pmid + '" href="' +
          ez_format_link(p,
              'http://dx.doi.org/' + uneval_trim(r.item[i].doi)
          ) + '" target="_blank">publisher</a>';
      if (local_mirror) {
        tmp += '<a id="thepaperlink_shark' + pmid +
          '" href="https://' + local_mirror + '/' + uneval_trim(r.item[i].doi) +
          '#" target="_blank">local</a>';
      }
      div_html += tmp;
    } else if (r.item[i].pii) {
      tmp = '<a id="thepaperlink_pii' + pmid + '" href="' +
          ez_format_link(p,
              'http://linkinghub.elsevier.com/retrieve/pii/' + uneval_trim(r.item[i].pii)
          ) + '" target="_blank">publisher</a>';
      if (local_mirror) {
        tmp += '<a id="thepaperlink_shark' + pmid +
          '" href="https://' + local_mirror + '/retrieve/pii/' + uneval_trim(r.item[i].pii) +
          '" target="_blank">local</a>';
      }
      div_html += tmp;
    }
    if (r.item[i].pii && byID('citedBy' + pmid)) { // @@@@
      insert_span = page_d.createElement('span');
      insert_span.innerHTML = '; <a href="' +
          ez_format_link(p,
              'http://linkinghub.elsevier.com/retrieve/pii/' + uneval_trim(r.item[i].pii)
          ) + '" target="_blank">Scopus</a> <span id="pl4_scopus' + pmid + '"></span>';
      byID('citedBy' + pmid).parentNode.appendChild(insert_span);
    }
    if (r.item[i].f_v && r.item[i].fid) {
      tmp = '<a id="thepaperlink_f' + pmid + '" class="thepaperlink-red" href="' +
          ez_format_link(p,
              'https://f1000.com/prime/' + uneval_trim(r.item[i].fid)
          ) + '" target="_blank">f1000<sup>' + uneval_trim(r.item[i].f_v) + '</sup></a>';
      div_html += tmp;
    }
    if (msg.pubmeder || msg.cloud_op) {
      tmp = '<span id="thepaperlink_save' + pmid +
          '" class="thepaperlink-home" onclick="saveIt(\'' + pmid +
          '\',\'' + uneval_trim(msg.save_key) + '\',\'' + uneval_trim(msg.save_email) + '\',\'' +
          uneval_trim(msg.tpl) + '\',\'' + uneval_trim(msg.cloud_op) + '\')">save&nbsp;it</span>';
      div_html += tmp;
    }
    if (msg.tpl) { // check on 2018-9-14
      tmp = '<span id="thepaperlink_rpt' + pmid +
          '" class="thepaperlink-home" onclick="show_me_the_money(\'' +
          pmid + '\',\'' + uneval_trim(msg.tpl) + '\',\'' + uneval_trim(msg.tpll) +
          '\')">&hellip;</span>';
      div_html += tmp;
    }
    if (msg.tpl && r.item[i].pdf) {
      tmp = '<span class="thepaperlink_Off" id="thepaperlink_hidden' + pmid + '"></span>';
      div_html += tmp;
    }
    div.innerHTML = div_html;
    byID(pmid).appendChild(div);
    k += 1;

    if (byID('thepaperlink_abs' + pmid)) {
      byID('thepaperlink_abs' + pmid).onclick = function () {
        byID(this.id).textContent = 'trying';
        a_proxy({ajaxAbs:this.id.substr(16)});
      };
      if (!slfoV || slfoV < 2.0) {
        byID('thepaperlink_abs' + pmid).parentNode.style.opacity = 0.3333;
      } else if ((slfoV && slfoV > 9.9) || (r.item[i].f_v && r.item[i].fid)) {
        byID(pmid).style.paddingTop = '10px';
        var barText = page_d.createElement('textarea');
        barText.style.display = 'none';
        barText.id = 'thepaperlink_text' + pmid;
        barText.className = 'thepaperlink-text';
        byID(pmid).appendChild(barText);
        if (slfoV > 30.0) {
            byID(pmid).style.borderRight = '6px solid red';
        } else if (slfoV > 20.0) {
            byID(pmid).style.borderRight = '4px solid red';
        } else {
            byID(pmid).style.borderRight = '4px solid yellow';
        }
      }
    }

    if (byID('thepaperlink_hidden' + pmid)) { // @@@@
      byID('thepaperlink_hidden' + pmid).addEventListener('email_pdf', function () {
        var eventData = this.textContent,
            evt_pmid = this.id.substr(19),
            pdf = byID('thepaperlink_pdf' + evt_pmid).href,
            no_email_span = byID('thepaperlink_save' + evt_pmid).className;
        if ( (' ' + no_email_span + ' ').indexOf(' no_email ') > -1 ) {
          a_proxy({upload_url: eventData, pdf: pdf, pmid: evt_pmid, no_email: 1});
        } else {
          a_proxy({upload_url: eventData, pdf: pdf, pmid: evt_pmid, no_email: 0});
          try {
            byID('thepaperlink_D' + evt_pmid).setAttribute('class', 'thepaperlink_Off');
          } catch (err) {
            DEBUG && console.log(err);
          }
        }
      });
    }
  } // for loop r.count
  if (pmidArray.length > 0 && onePage_calls) { // && onePage_calls < 10
    if (pmidArray.length === k) {
      DEBUG && console.log('>> got nothing; stopped. ' + k);
    } else {
      DEBUG && console.log('>> call for ' + k + ', not get ' + pmidArray.length);
      byID('pl4_title').innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' +
          loading_gif + '" width="16" height="11" alt="loading" />';
      onePage_calls += 1; // @@@@
      a_proxy({url: '/api?a=chrome2&pmid=' + pmidArray.join(',') + '&apikey='});
    }
  }
  DEBUG && console.log('>> onePage_calls: ' + onePage_calls);
  //sendResponse({});
}
//chrome.extension.onRequest.addListener(get_request);
chrome.runtime.onMessage.addListener(get_request); // msg from b_proxy
_port.onMessage.addListener(get_request);
