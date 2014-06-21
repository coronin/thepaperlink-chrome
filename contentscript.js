"use strict";

/*
 * Copyright (c) 2013 Liang Cai . All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 *
 * http://cail.cn
 * initial version, a UserScript for GreaseMonkey Firefox, http://userscripts.org/scripts/show/97865
 */

var DEBUG = false,
  noRun = 0,
  page_d = document,
  page_url = page_d.URL,
  loading_gif = chrome.extension.getURL('loadingLine.gif'),
  clippy_file = chrome.extension.getURL('clippyIt.png'),
  pmids = '',
  pmidArray = [],
  old_title = '',
  search_term = '',
  search_result_count = '',
  onePage_calls = 0,
  date = new Date(),
  _port = chrome.runtime.connect({name: 'background_port'});


if (typeof uneval === 'undefined') {
  var uneval = function (a) {
    return ( JSON.stringify(a) ) || '';
  };
}

function uneval_trim(a) {
  var b = uneval(a) || '""';
  return b.substr(1, b.length - 2);
}

function t(n) { return page_d.getElementsByTagName(n); }

function $(d) { return page_d.getElementById(d); }

function trim(s) { return ( s || '' ).replace( /^\s+|\s+$/g, '' ); }

function a_proxy(d) {
  DEBUG && console.log('>> sendRequest to background.html');
  //chrome.extension.sendRequest(d);
  _port.postMessage(d);
}

function process_dxy() {
  var i, len, ele,
    pmid = page_url.split('://pubmed.cn/')[1],
    digi_pmid = parseInt(pmid, 10);
  if (pmid && pmid === '' + digi_pmid && $('SFW').textContent.indexOf(pmid) > 0) {
    a_proxy({from_dxy: pmid});
  }
  for (i = 0, len = t('div').length; i < len; i += 1) {
    ele = t('div')[i];
    if (ele.className === 'setting') {
      ele.setAttribute('id', 'thepaperlink_bar');
      break;
    }
  }
}

function process_f1000() {
  var i, len, pmid = '',
    f_v = 0,
    fid = parseInt(page_url.split('://f1000.com/prime/')[1], 10);
  for (i = 0, len = t('div').length; i < len; i += 1) {
    if (t('div')[i].className === 'abstract-doi-pmid') {
      pmid = parseInt(t('div')[i].textContent.split('PMID:')[1], 10);
    } else if (t('div')[i].className === 'articleFactor' && t('div')[i-1].id === 'article') {
      f_v = parseInt(t('div')[i].textContent, 10);
      // t('div')[i+3].setAttribute('id', '_thepaperlink_div'); // hidden tootip
    }
  }
  if (pmid && f_v && fid) { // require valid f1000.com login
    a_proxy({from_f1000: pmid + ',' + fid + ',' + f_v});
  } else {
    DEBUG && console.log('>> process_f1000: ' +
      pmid + ',' + fid + ',' + f_v);
  }
}

function order_gs() {
  var i, len, tobe = [], nodes = [],
    lists = $('_thepaperlink_order_lists').textContent.split(';');
  if ($('_thepaperlink_order_status').textContent === '0') {
    if (lists[1] === lists[0]) {
      tobe = lists[2].split(',');
      $('_thepaperlink_order_status').textContent = '2';
    } else {
      tobe = lists[1].split(',');
      $('_thepaperlink_order_status').textContent = '1';
    }
  } else if ($('_thepaperlink_order_status').textContent === '1') {
    tobe = lists[2].split(',');
    $('_thepaperlink_order_status').textContent = '2';
  } else {
    tobe = lists[0].split(',');
    $('_thepaperlink_order_status').textContent = '0';
  }
  $('gs_ccl').style.display = 'none';
  for (i = 0, len = tobe.length; i < len; i += 1) {
    nodes.push( $('_thepaperlink_' + tobe[i]) );
    $('gs_ccl').removeChild( $('_thepaperlink_' + tobe[i]) );
  }
  for (i = 0, len = nodes.length; i < len; i += 1) {
    $('gs_ccl').insertBefore(nodes[i], $('_thepaperlink_pos0'));
  }
  nodes = null;
  $('gs_ccl').style.display = 'block';
}

function process_googlescholar() {
  var i, ilen, j, jlen, tmp, nodes = $('gs_ccl').childNodes, a, b, c, d = [];
  for (i = 0, ilen = nodes.length; i < ilen; i += 1) {
    if (nodes[i].className === 'gs_alrt_btm') {
      nodes[i].setAttribute('id', '_thepaperlink_pos0');
      continue;
    }
    a = nodes[i].lastChild;
    if (!a) { continue; }
    for (j = 0, jlen = a.childNodes.length; j < jlen; j += 1) {
      if (a.childNodes[j].className === 'gs_fl') {
        b = a.childNodes[j].textContent; // class: gs_r -> gs_ri -> gs_fl
        if (b.substr(0, 9) === 'Cited by ') {
          c = parseInt(b.substr(9,7), 10);
          nodes[i].setAttribute('id', '_thepaperlink_' + c);
          d.push(c);
        }
        break;
      }
    }
  }
  if (d.length > 0) {
    tmp = page_d.createElement('div');
    tmp.setAttribute('style', 'float:right;cursor:pointer');
    tmp.innerHTML = '&nbsp;&nbsp;<span id="_thepaperlink_order_gs">[order the results, v' +
     '<span id="_thepaperlink_order_status">0</span>]</span>' +
     '<span id="_thepaperlink_order_lists" style="display:none">' +
     d.join(',') + ';' +
     d.sort(function(u,v){return v-u;}).join(',') + ';' +
     d.sort(function(u,v){return u-v;}).join(',') + '</span>';
    $('gs_ab_md').appendChild(tmp);
    $('_thepaperlink_order_gs').onclick = function () { order_gs(); };
  }
}

function parse_id(a) { // pubmeder code
  var regpmid = /pmid\s*:?\s*(\d+)\s*/i,
    regdoi = /doi\s*:?\s*/i,
    doipattern = /(\d{2}\.\d{4}\/[a-zA-Z0-9\.\/\)\(-]+\w)\s*\W?/,
    regpmc = /pmcid\s*:?\s*(PMC\d+)\s*/i,
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
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, c, t_cont, t_strings, t_title, t_head;
  DEBUG && console.log(a);
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num + 1].className.indexOf('rprtnum') > -1) {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      } else {
        t(zone)[num - 2].setAttribute('id', ID[1]);
      }
      if (t(zone)[num].className === 'rprt') {
        t_cont = t(zone)[num + 2].textContent;
        t_strings = t_cont.split(' [PubMed - ')[0].split('.');
        t_title = trim( t_strings[0] );
        t_cont = t_title +
          '.\r\n' + trim( t_strings[1] ) +
          '.\r\n' + trim( t_strings[2] ) +
          '. ' + trim( t_strings[3] ) +
          '. [PMID:' + ID[1] + ']\r\n';
      } else{ // display with abstract
        if (a.indexOf('Epub ') > 0) {
          t_head = a.split('Epub ');
          t_strings = t_head[1].replace('].', '.').replace(']', '.').split('.');
          t_head = t_head[0].split('.');
          t_title = trim( t_strings[1] );
          t_cont = t_title +
            '.\r\n' + trim( t_strings[2] ) +
            '.\r\n' + trim( t_head[0] ) +
            '. ' + trim( t_head[1] ) +
            '. [PMID:' + ID[1] + ']\r\n';
        } else if (a.indexOf('doi: ') > 0) {
          t_head = a.split('doi: ');
          t_strings = t_head[1].replace( /^\S+\.([a-z]+)\s/i, '$1 ' ).split('.');
          t_title = trim( t_strings[0] );
          t_cont = t_title +
            '.\r\n' + trim( t_strings[1] ) +
            '.\r\n' + trim( t_head[0] ) +
            ' [PMID:' + ID[1] + ']\r\n';
        } else {
          t_strings = a.split('.');
          t_title = trim( t_strings[2] );
          t_cont = t_title +
            '.\r\n' + trim( t_strings[3] ) +
            '.\r\n' + trim( t_strings[0] ) +
            '. ' + trim( t_strings[1] ) +
            '. [PMID:' + ID[1] + ']\r\n';
        }
      }
      DEBUG && console.log(t_cont);
      b = page_d.createElement('div');
      b.innerHTML = '<div style="float:right;z-index:1;cursor:pointer">' +
        '<img class="pl4_clippy" title="copy to clipboard" src="' + clippy_file +
        '" alt="copy" width="14" height="14" />&nbsp;&nbsp;</div>';
      b.onclick = function () { // chrome.extension.sendRequest
        a_proxy({t_cont: t_cont});
      };
      if (t(zone)[num].className === 'rprt') {
        t(zone)[num + 3].appendChild(b);
      } else { // display with abstract
        t(zone)[num + 1].appendChild(b);
      }
      pmids += ',' + ID[1];
      if (a.indexOf('- in process') < 0) {
        c = page_d.createElement('span');
        c.setAttribute('style', 'border-left:6px #fccccc solid;padding-left:6px;font-size:11px');
        c.innerHTML = 'Cited by: <span id="citedBy' + ID[1] + '">waiting</span>';
        if (t(zone)[num].className === 'rprt') {
          t(zone)[num + 4].appendChild(c);
        } else { // display with abstract
          t(zone)[num + 5].appendChild(c);
        }
        a_proxy({a_pmid: ID[1], a_title: t_title});
      }
    }
  }
}

function get_Json(pmids) {
  var i, len, ele,
    need_insert = 1,
    url = '/api?flash=yes&a=chrome1&pmid=' + pmids,
    loading_span = '<span style="font-weight:normal;font-style:italic"> fetching data from "the paper link"</span>&nbsp;&nbsp;<img src="' + loading_gif + '" width="16" height="11" alt="loading" />';
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0, len = t('h2').length; i < len; i += 1) {
    ele = t('h2')[i];
    if (ele.className === 'result_count') {
      need_insert = 0;
      ele.setAttribute('id', 'pl4_title');
      old_title = ele.innerHTML;
      search_result_count = ele.textContent;
      if (search_result_count.indexOf(' of ') > 0) {
        search_result_count = parseInt(search_result_count.split(' of ')[1], 10);
      } else if (search_result_count.indexOf('Results: ') > -1) {
        search_result_count = parseInt(search_result_count.substr(9, search_result_count.length), 10);
      } else {
        search_result_count = 0;
      }
      a_proxy({search_term: search_term, search_result_count: search_result_count});
      ele.innerHTML = old_title + loading_span;
    }
  }
  if (need_insert) {
    ele = page_d.createElement('h2');
    ele.innerHTML = loading_span;
    ele.setAttribute('id', 'pl4_title');
    $('messagearea').appendChild(ele);
  }
  onePage_calls += 1;
  a_proxy({url: url});
}

function run() {
  var i, len, z;
  try {
    search_term = $('term').value; // 2013-3-26
  } catch (err) {
    DEBUG && console.log(err);
  }
  a_proxy({reset_scholar_count: 1});
  for (i = 0, len = t('div').length; i < len; i += 1) {
    if (t('div')[i].className === 'rprt' || t('div')[i].className === 'rprt abstract') {
      getPmid('div', i);
    } else if (!search_term && t('div')[i].className === 'print_term') {
      z = t('div')[i].textContent;
      if (z) {
        search_term = z.substr(8, z.length);
      }
    }
  }
  pmids = pmids.substr(1, pmids.length);
  pmidArray = pmids.split(',');
  if (pmidArray.length > 0) {
    a_proxy({sendID: pmidArray[0]});
  }
  if (pmids) {
    localStorage.setItem('thePaperLink_ID', pmidArray[0]);
    get_Json(pmids);
  }
}

function alert_dev(req_key) {
  if (req_key) {
    var oXHR = new XMLHttpRequest();
    oXHR.open('POST', 'http://0.cail.cn/?action=alert_dev&pmid=1&apikey=' + req_key, true);
    oXHR.onreadystatechange = function (oEvent) {
      if (oXHR.readyState === 4) {
        if (oXHR.status === 200) {
          $('thepaperlink_alert').innerHTML = '&lt;!&gt; Just sent the alert.';
        } else {
          DEBUG && console.log('Error', oXHR.statusText);
      }  }
    };
    setTimeout(function () {
      oXHR.abort();
    }, 60*1000); // 1-min timeout
    oXHR.send(null);
  } else {
    alert('\n you have to be a registered user to be able to alert the developer\n');
  }
}


if (page_url === 'http://www.thepaperlink.com/reg'
    || page_url === 'http://www.zhaowenxian.com/reg') { // storage data for access the api server
  var apikey = $('apikey').innerHTML,
    cloud_op = $('cloud_op').innerHTML;
  a_proxy({save_apikey: apikey, save_email: null});
  a_proxy({save_cloud_op: cloud_op});
  noRun = 1;
} else if (page_url === 'http://www.pubmeder.com/registration'
    || page_url === 'http://pubmeder-hrd.appspot.com/registration'
    || page_url === 'https://pubmeder-hrd.appspot.com/registration'
    || page_url === 'http://1.zhaowenxian.com/registration') { // storage data for access the bookmark server
  var email = $('currentUser').innerHTML,
    apikey = $('apikey_pubmeder').innerHTML;
  a_proxy({save_apikey: apikey, save_email: email});
  noRun = 1;
} else if (page_url.indexOf('://www.thepaperlink.com/oauth') > 0) {
  var content = $('r_content').innerHTML,
    service = $('r_success').innerHTML;
  a_proxy({service: service, content: content});
  noRun = 1;
} else if (page_url.indexOf('://f1000.com/prime/') > 0) {
  process_f1000();
  noRun = 1;
} else if (page_url.indexOf('://scholar.google.com/scholar?') > 0) {
  process_googlescholar();
  noRun = 1;
} else if (page_url.indexOf('://pubmed.cn/') > 0) {
  process_dxy();
  noRun = 1;
} else if (page_url.indexOf('://www.ncbi.nlm.nih.gov/pubmed') === -1
    && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&') === -1
    && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez') === -1) {
  var ID = parse_id(page_d.body.textContent) || parse_id(page_d.body.innerHTML);
  if (ID !== null && ID[1] !== '999999999') {
    DEBUG && console.log('>> other site, got ID ' + ID[1]);
    a_proxy({sendID: ID[1]});
  }
  noRun = 1;
}
if ($('_thepaperlink_client_status')) {
  //$('_thepaperlink_client_status').innerHTML = chrome.extension.getURL('options.html');
  $('_thepaperlink_client_status').innerHTML = chrome.runtime.id;
}
if ($('_thepaperlink_client_modify_it')) {
  $('_thepaperlink_client_modify_it').innerHTML = 'the browser you are using is good for that';
}
if (!noRun) {
  a_proxy({loadExtraJs: 1});
  run();
}

function get_request(msg) {
  DEBUG && console.log(msg);
  if (msg.js_base_uri) {
    if (window.location.protocol === 'https:' && msg.js_base_uri.substr(0,5) !== 'https') {
      msg.js_base_uri = 'https://pubget-hrd.appspot.com';
    }
    if (!$('paperlink2_display')) {
      var peaks = page_d.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      peaks.setAttribute('src', msg.js_base_uri + '/jss?y=' + (Math.random()));
      page_d.body.appendChild(peaks);
    }
    //sendResponse({});
    return;

  } else if (msg.except) {
    if (!search_term) {
      search_term = page_url.split('/pubmed/')[1];
    }
    if (!search_term) {
      search_term = localStorage.getItem('thePaperLink_ID');
    }
    $('pl4_title').innerHTML = old_title +
      ' <span style="font-size:14px;font-weight:normal;color:red">Error' +
      '<span style="cursor:pointer" id="thepaperlink_alert">!&nbsp;</span>' +
      'Enable proxy by right click, Options/settings. ' +
      '&para; <a href="http://www.zhaowenxian.com/?q=' + search_term +
      '" target="_blank">the paper link</a></span>';
    $('thepaperlink_alert').onclick = function () {
      var answer = confirm('\n do you want to alert the developer about this error?\n');
      if (answer) {
        alert_dev( uneval_trim(msg.tpl) );
      }
    };
    //sendResponse({});
    return;

  } else if (msg.js_key && msg.js_base) {
    if (window.location.protocol === 'https:' && msg.js_base.substr(0,5) !== 'https') {
      msg.js_base = 'https://pubget-hrd.appspot.com/';
    }
    DEBUG && console.log('>> starting the js client');
    localStorage.setItem('thePaperLink_pubget_js_key', msg.js_key);
    localStorage.setItem('thePaperLink_pubget_js_base', msg.js_base);
    if (!$('__tr_display')) {
      var jsClient = page_d.createElement('script');
      jsClient.setAttribute('type', 'text/javascript');
      jsClient.setAttribute('src', msg.js_base + 'js?y=' + (Math.random()));
      page_d.body.appendChild(jsClient);
    }
    //sendResponse({});
    return;

  } else if (msg.g_scholar) {
    try {
      if (msg.g_num === 1 && msg.g_link === 1) {
        $('citedBy' + msg.pmid).innerText = 'trying';
      } else if (msg.g_num === 0 && msg.g_link === 0) {
        $('citedBy' + msg.pmid).innerHTML = '<i>Really? No one cited it yet. Is it a very recent publication?</i>';
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          $('citedBy' + msg.pmid).parentNode.setAttribute('class', 'thepaperlink_Off');
        }
      } else if (msg.g_num && msg.g_link) {
        $('citedBy' + msg.pmid).innerHTML = uneval_trim(msg.g_num) +
          ' times <a target="_blank" href="http://scholar.google.com' +
          uneval_trim(msg.g_link) + '">(in Google Scholar)</a>';
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
    //sendResponse({});
    return;

  } else if (msg.el_id && msg.el_data) {
    try {
      if (msg.el_data && msg.el_data.indexOf('://') > -1) {
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          var e = $('thepaperlink' + msg.el_id);
          if (msg.el_data === '://') {
            e.parentNode.removeChild(e);
          } else {
            e.innerText = 'pdf file';
            e.href = uneval_trim(msg.el_data);
          }
        } else {
          $(msg.el_id).innerHTML = '&raquo; <a target="_blank" href="' +
            uneval_trim(msg.el_data) +'">the file link</a>';
        }
      } else if (msg.el_data === 1 && page_url.indexOf('://www.ncbi.nlm.nih.gov/') === -1) {
        $(msg.el_id).innerText = 'trying';
      } else {
        $(msg.el_id).innerText = msg.el_data;
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
    //sendResponse({});
    return;

  } else if (msg.search_trend) {
    var hook = $('myncbiusername').textContent;
    $('myncbiusername').innerHTML = '<span style="color:yellow">' + msg.search_trend +
      '</span>&nbsp;&nbsp;&nbsp;&nbsp;' + hook;
    $('myncbiusername').style.display = 'inline';
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
      '  margin: 0 6px' +
      '}' +
      'a.thepaperlink-green {' +
      '  color: green' +
      '}' +
      'a.thepaperlink-red {' +
      '  color: red' +
      '}' +
      '.thepaperlink-home {' +
      '  color: grey;' +
      '  text-decoration: none;' +
      '  cursor: pointer' +
      '}' +
      'img.pl4_clippy {' +
      '  opacity: 0.4' +
      '}' +
      'img.pl4_clippy:hover {' +
      '  opacity: 1.0' +
      '}',
    r = msg.r;

  if (r && r.error) {
    $('pl4_title').innerHTML = old_title +
      ' <span style="font-size:14px;font-weight:normal;color:red">"the paper link" error ' +
      uneval(r.error) + '</span>';
    //sendResponse({});
    return;
  }

  if (msg.to_other_sites) { // dxy, f1000
    insert_style = page_d.createElement('style');
    insert_style.type = 'text/css';
    insert_style.appendChild(page_d.createTextNode(styles));
    page_d.body.appendChild(insert_style);
    div = page_d.createElement('div');
    div.className = 'thepaperlink';
    div_html = '<a class="thepaperlink-home" href="' + msg.uri + '/?q=pmid:' +
      msg.pmid + '" target="_blank">the paper link</a>';
    div_html += msg.extra;
    div.innerHTML = div_html;
    $(msg.to_other_sites).appendChild(div);
    //sendResponse({});
    return;
  }

  if (!r || !r.count) {
    //sendResponse({});
    return;
  }

  p = uneval_trim(msg.p);
  if (!$('css_loaded')) {
    insert_style = page_d.createElement('style');
    insert_style.type = 'text/css';
    insert_style.appendChild(page_d.createTextNode(styles));
    page_d.body.appendChild(insert_style);
    //GM_addStyle(styles);
  }
  if (msg.pubmeder) {
    bookmark_div += '<span id="thepaperlink_saveAll" onclick="saveIt_pubmeder(\'' +
      pmids + '\',\'' + uneval_trim(msg.save_key) + '\',\'' +
      uneval_trim(msg.save_email) + '\')">pubmeder&nbsp;all</span></div>';
  } else {
    bookmark_div += 'save what you are reading? try<a href="http://www.pubmeder.com/registration" target="_blank">PubMed-er</a></div>';
  }
  if (old_title) {
    $('pl4_title').innerHTML = old_title + bookmark_div;
  } else {
    $('pl4_title').innerHTML = '';
  }
  for (i = 0; i < r.count; i += 1) {
    pmid = uneval_trim(r.item[i].pmid);
    k = pmidArray.length;
    for (j = 0; j < k; j += 1) {
      if (pmid === pmidArray[j]) {
        pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
      }
    }
    if ($('pl4me_' + pmid)) {
      continue;
    }
    div = page_d.createElement('div');
    div.className = 'thepaperlink';
    div_html = '<a class="thepaperlink-home" id="pl4me_' + pmid +
      '" href="' + msg.uri + '/?q=pmid:' +
      pmid + '" target="_blank">the paper link</a>: ';
    if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
      tmp = '<span>impact&nbsp;' + uneval_trim(r.item[i].slfo) + '</span>';
      div_html += tmp;
    }
    if (r.item[i].pdf) {
      tmp = '<a id="thepaperlink_pdf' + pmid +
        '" class="thepaperlink-green" href="' + p + uneval_trim(r.item[i].pdf) +
        '" target="_blank">direct&nbsp;pdf</a>';
      div_html += tmp;
    } else if (r.item[i].pii) {
      a_proxy({pmid: pmid, pii: r.item[i].pii, pii_link: 1});
      tmp = '<a id="thepaperlink_pdf' + pmid + '" href="#" target="_blank"></a>';
      div_html += tmp;
    }
    if (r.item[i].pmcid) {
      tmp = '<a id="thepaperlink_pmc' + pmid +
        '" href="https://www.ncbi.nlm.nih.gov/pmc/articles/' +
        uneval_trim(r.item[i].pmcid) + '/?tool=thepaperlink_chrome" target="_blank">open&nbsp;access</a>';
      div_html += tmp;
    }
    if (r.item[i].doi) {
      tmp = '<a id="thepaperlink_doi' + pmid +
        '" href="' + p + 'http://dx.doi.org/' + uneval_trim(r.item[i].doi) +
        '" target="_blank">publisher</a>';
      div_html += tmp;
    } else if (r.item[i].pii) {
      tmp = '<a id="thepaperlink_doi' + pmid +
        '" href="' + p + 'http://linkinghub.elsevier.com/retrieve/pii/' +
        uneval_trim(r.item[i].pii) + '" target="_blank">publisher</a>';
      div_html += tmp;
    }
    if (r.item[i].pii && $('citedBy' + pmid)) {
      insert_span = page_d.createElement('span');
      insert_span.innerHTML = '; <span id="pl4_scopus' + pmid + '"></span> <a href="' +
        p + 'http://linkinghub.elsevier.com/retrieve/pii/' +
        uneval_trim(r.item[i].pii) + '" target="_blank">(in Scopus)</a>';
      $('citedBy' + pmid).parentNode.appendChild(insert_span);
    }
    if (r.item[i].f_v && r.item[i].fid) {
      tmp = '<a id="thepaperlink_f' + pmid +
        '" class="thepaperlink-red" href="' + p + 'http://f1000.com/' +
        uneval_trim(r.item[i].fid) + '" target="_blank">f1000&nbsp;star&nbsp;' +
        uneval_trim(r.item[i].f_v) + '</a>';
      div_html += tmp;
    }
    if (msg.pubmeder || msg.cloud_op) {
      tmp = '<span id="thepaperlink_save' + pmid +
        '" class="thepaperlink-home" onclick="saveIt(\'' + pmid +
        '\',\'' + uneval_trim(msg.save_key) + '\',\'' + uneval_trim(msg.save_email) + '\',\'' +
        uneval_trim(msg.tpl) + '\',\'' + uneval_trim(msg.cloud_op) + '\')">save&nbsp;it</span>';
      div_html += tmp;
    }
    if (msg.tpl) {
      tmp = '<span id="thepaperlink_rpt' + pmid +
        '" class="thepaperlink-home" onclick="show_me_the_money(\'' +
        pmid + '\',\'' + uneval_trim(msg.tpl) + '\')">&hellip;</span>';
      div_html += tmp;
    }
    if (msg.tpl && r.item[i].pdf) {
      tmp = '<span class="thepaperlink_Off" id="thepaperlink_hidden' +
        pmid + '"></span>';
      div_html += tmp;
    }
    div.innerHTML = div_html;
    $(pmid).appendChild(div);

    if ($('thepaperlink_hidden' + pmid)) {
      $('thepaperlink_hidden' + pmid).addEventListener('email_pdf', function () {
        var eventData = this.textContent,
          evt_pmid = this.id.substr(19),
          pdf = $('thepaperlink_pdf' + evt_pmid).href,
          no_email_span = $('thepaperlink_save' + evt_pmid).className;
        if ( (' ' + no_email_span + ' ').indexOf(' no_email ') > -1 ) {
          a_proxy({upload_url: eventData, pdf: pdf, pmid: evt_pmid, no_email: 1});
        } else {
          a_proxy({upload_url: eventData, pdf: pdf, pmid: evt_pmid, no_email: 0});
          try {
            $('thepaperlink_D' + evt_pmid).setAttribute('class', 'thepaperlink_Off');
          } catch (err) {
            DEBUG && console.log(err);
          }
        }
      });
    }
  }
  if (pmidArray.length > 0 && onePage_calls < 10) {
    if (pmidArray.length === k) {
      DEBUG && console.log('>> got nothing; stopped. ' + k);
    } else {
      DEBUG && console.log('>> call for ' + k + ', not get ' + pmidArray.length);
      $('pl4_title').innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' +
        loading_gif + '" width="16" height="11" alt="loading" />';
      onePage_calls += 1;
      a_proxy({url: '/api?a=chrome2&pmid=' + pmidArray.join(',') + '&apikey='});
    }
  }
  DEBUG && console.log('>> onePage_calls: ' + onePage_calls);
  //sendResponse({});
  return;
}
//chrome.extension.onRequest.addListener(get_request);
chrome.runtime.onMessage.addListener(get_request); // from b_proxy
_port.onMessage.addListener(get_request);