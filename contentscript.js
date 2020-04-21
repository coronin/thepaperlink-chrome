"use strict";

/*
 * Copyright (c) Liang Cai .  All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 *
 * http://about.me/cail
 *
 * this started as a UserScript for GreaseMonkey Firefox, http://userscripts.org/scripts/show/97865
 *
 * the paper link 3:
 *   https://github.com/coronin/thepaperlink-chrome/releases
 */

var DEBUG = false,
    noRun = 0,
    page_d = document,
    page_url = page_d.URL,
    loading_gif = chrome.extension.getURL('loadingLine.gif'),
    clippy_file = chrome.extension.getURL('clippyIt.png'),
    _port = null,
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
limited.id = 'thePaperLink_chrome_limited';
page_d.body.appendChild(limited);  // do not email_pdf


if (typeof uneval === 'undefined') {
  var uneval = function (a) {
    return ( JSON.stringify(a) ) || '';
  };
}

try {
  _port = chrome.runtime.connect({name: 'background_port'});
} catch (err) {
  console.log('>> ' + err);
}

function uneval_trim(a) {
  var b = uneval(a) || '""';
  return b.substr(1, b.length-2);
}

function byTag(d) { return page_d.getElementsByTagName(d); }
function byID(d) { return page_d.getElementById(d); }
function byClassOne(d) { return page_d.getElementsByClassName(d)[0]; }

function trim(s) { return ( s || '' ).replace( /^\s+|\s+$/g, '' ); }

function a_proxy(d) {
  //chrome.extension.sendRequest(d);
  _port && _port.postMessage(d);
  _port || console.log('>> runtime fail to connect background_port');
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

function process_storkapp() { // 2018 Dec
  var i, len, ele, pmid = '';
  for (i = 0, len = byTag('a').length; i < len; i += 1) {
    ele = byTag('a')[i];
    if (ele.textContent.indexOf('ncbi.nlm.nih.gov/pubmed/') > 0) {
      pmid += parseInt(ele.textContent.split('ncbi.nlm.nih.gov/pubmed/')[1], 10);
      page_d.title = pmid; // ess.js
      a_proxy({from_nonF1000: pmid});
      ele.id = 'thepaperlink_bar';
      ele.innerHTML = ' the paper link';
      ele.href = 'https://www.thepaperlink.com/:' + pmid;
      ele.onclick = null;
      break;
    }
  }
  if (byID('abstractHolder') !== null) {  // 2020-1-10
    a_proxy({pageAbs: trim(byID('abstractHolder').textContent.split('  Copyright ')[0]),
             pmid: pmid});
  } else { console.log('process_storkapp: #abstractHolder N/A'); }
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
      byTag('span')[i].parentNode.id = 'thepaperlink_bar';
      byID('article-doi').style.display = 'none';
    }
  }
  if (pmid && f_v && fid) {
    page_d.title = pmid + '::' + doi; // ess.js
    a_proxy({from_f1000: pmid + ',' + fid + ',' + f_v});
  } else {
    DEBUG && console.log('process_f1000: '+pmid+','+fid+','+f_v);
  }
  if (byID('abstract-tab-content') !== null) {  // handle login page
    a_proxy({pageAbs: trim(byID('abstract-tab-content').textContent.split(' PMID: ')[0]),
             pmid: pmid});
  }
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
  if (!byID('gs_res_ccl_mid')) {
    console.log('Cannot find #gs_res_ccl_mid on this page.');
    return;
  }
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
          DEBUG && console.log('process_googlescholar', a);
          continue;
        }
      } else {
        c = parseInt(b.split('Related article')[0], 10);
      }
    }
    if (c) {
      nodes[i].id = '_thepaperlink_' + c;
      d.push(c);
    } else {
      byID('gs_res_ccl_mid').removeChild( nodes[i] );
    }
  }
  if (d.length > 0) {
    if (byID('_thepaperlink_cited_order') !== null){
      byID('_thepaperlink_order_lists').textContent = d.join(',') + ';' +
          d.sort(function(u,v){return v-u;}).join(',') + ';' +
          d.sort(function(u,v){return u-v;}).join(',');
    } else {
      tmp = page_d.createElement('div');
      tmp.setAttribute('style', 'float:right;cursor:pointer;color:red');
      tmp.innerHTML = '&nbsp;&nbsp;<span id="_thepaperlink_order_gs">cited order ' +
          '<span id="_thepaperlink_order_status">0</span>&nbsp; <span style="background-color:yellow">' +
          '(0:original; 1:decreased; 2:increased)</span></span>' +
          '<span id="_thepaperlink_order_lists" style="display:none">' +
          d.join(',') + ';' +
          d.sort(function(u,v){return v-u;}).join(',') + ';' +
          d.sort(function(u,v){return u-v;}).join(',') + '</span>';
      tmp.id = '_thepaperlink_cited_order';
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

function legacy_pubmed(zone, num) {
  var a = byTag(zone)[num].textContent,
      regpmid = /PMID:\s(\d+)\s/,
      ID, b, c, t_cont, t_strings, t_title, t_i;
  DEBUG && console.log('zone.textContent', a);
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (byTag(zone)[num + 1].className.indexOf('rprtnum') > -1) {
        byTag(zone)[num + 2].id = 'tpl'+ID[1];
      } else { // abstract page
        byTag(zone)[num - 3].id = 'tpl'+ID[1];
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
      DEBUG && console.log('t_cont', t_cont);
      b = page_d.createElement('div');
      b.innerHTML = '<div style="float:right;z-index:1;cursor:pointer">' +
          '<img class="pl4_clippy" title="copy to clipboard" src="' + clippy_file +
          '" alt="copy" width="14" height="14" />&nbsp;&nbsp;</div>';
      b.onclick = function () { a_proxy({t_cont: t_cont}); };
      c = page_d.createElement('span');
      c.setAttribute('style', 'font-size:11px'); // border-left:4px #fccccc solid;padding-left:4px;margin-left:4px;
      c.innerHTML = '<span id="citedBy' + ID[1] + '">...</span>'; // @@@@ 'Access-Control-Allow-Origin' header is present on the requested resource.
      if (byTag(zone)[num].className === 'rprt') {
        byTag(zone)[num + 3].appendChild(b);
        if (a.indexOf('- in process') < 0) {
          byTag(zone)[num + 4].appendChild(c);
        }
        byID('tpl'+ID[1] ).getElementsByClassName('jrnl')[0].id = 'thepaperlink_if' + ID[1]; // p.details span.jrnl
      } else { // abstract page
        byTag(zone)[num + 1].appendChild(b);
        a_proxy({pageAbs: byTag(zone)[num + 8].textContent, pmid: ID[1]});
        if (a.indexOf('- in process') < 0) {
          byTag(zone)[num + 5].appendChild(c);
        }
        byClassOne('cit').getElementsByTagName('span')[0].id = 'thepaperlink_if' + ID[1]; // div.cit span
      }
      pmidString += ',' + ID[1];
      a_proxy({a_pmid: ID[1], a_title: t_title}); // queue_scholar_title
    } // regpmid.exec(a)
  } // regpmid.test(a)
}

function LastFirst(s) {
  var ss = s.split(' '),
      st = ss[ss.length-1] + ' ',
      si = 0;
  for (si; si < ss.length-1; si += 1) {
    st += ss[si][0];
  }
  return st;
}

function new_pubmed_single() {
  var ID, b, c, t_cont, t_title, author_multi;
  ID = byTag('strong')[0].textContent;
  byID('full-view-journal-trigger').parentNode.id = 'thepaperlink_if' + ID;
  if (pmidString.indexOf(ID) < 0) {
    pmidString += ',' + ID;
  }
  if ( byClassOne('ahead-of-print') ) {
    byClassOne('ahead-of-print').textContent = '';
  }
  t_title = trim( byTag('h1')[0].textContent );
  if (t_title[t_title.length-1] !== '.') {
    t_title += '.';
  }
  if (byID('en-abstract') !== null) {
    a_proxy({pageAbs: trim( byID('en-abstract').textContent.replace( /\s\s+/g, ' ' ) ), pmid: ID});
  }
  a_proxy({a_pmid: ID, a_title: t_title}); // queue_scholar_title

  var peaks = byClassOne('authors-list').getElementsByClassName('authors-list-item'), peaki = 0, peakss;
  author_multi = '';
  for (peaki = 0; peaki < peaks.length; peaki += 1) {
    peakss = trim( peaks[peaki].textContent.replace(/\s*\d\s*/g, '') );  // @@@@ Affiliations
    if (peakss.indexOf(',') > 0) {
      peaks[peaki].innerHTML = '<span class="paperlink2_found">' + LastFirst(peakss.substr(0, peakss.length-1)) + '</span>, ';
      author_multi += peaks[peaki].textContent;
    } else {
      peaks[peaki].innerHTML = '<span class="paperlink2_found">' + LastFirst(peakss) + '</span>';
      author_multi += peaks[peaki].textContent + '.';
    }
  }

  if ( byClassOne('empty-authors') || !author_multi ) {
    t_cont = t_title + '\r\n' +
      trim( byID('full-view-journal-trigger').textContent ) + ', ' +
      trim( (byClassOne('cit') || byClassOne('volume-issue-pages')).textContent );
  } else if ( byClassOne('cit') ) {
    t_cont = t_title + '\r\n' + author_multi + '\r\n' +
      trim( byID('full-view-journal-trigger').textContent ) + ', ' +
      trim( byClassOne('cit').textContent );
  } else if ( byClassOne('volume-issue-pages') ) {
    t_cont = t_title + '\r\n' + author_multi + '\r\n' +
      trim( byID('full-view-journal-trigger').textContent ) + ', ' +
      trim( byClassOne('volume-issue-pages').textContent ) + ' (' +
      trim( byTag('time')[0].textContent ) + '). ';
  } else {
    t_cont = t_title + '\r\n' + author_multi + '\r\n' +
      trim( byID('full-view-journal-trigger').textContent ) + ' (' +
      trim( byTag('time')[0].textContent ) + '). ';
  }
  t_cont += '  PMID:' + ID + '\r\n';
  DEBUG && console.log('t_cont', t_cont);

  b = page_d.createElement('div');
  b.setAttribute('style', 'float:right;padding-right:14px;z-index:1;cursor:pointer');
  b.innerHTML = '<img class="pl4_clippy" title="copy to clipboard" src="' + clippy_file +
      '" alt="copy" width="14" height="14" />';
  b.onclick = function () { a_proxy({t_cont: t_cont}); };
  byID('full-view-identifiers').appendChild(b);

  c = page_d.createElement('span');
  c.setAttribute('style', 'font-size:11px');
  c.innerHTML = '<br/><span id="citedBy' + ID + '">...</span>';
  byID('full-view-identifiers').appendChild(c);

  //byTag('time')[0].textContent += '. ';
  //byTag('time')[0].id = 'tpl'+ID;
  byID('full-view-identifiers').getElementsByClassName('identifier pubmed')[0].id = 'tpl'+ID;
}

function id_journal(s, pmid) {
  var sa = trim(s),
      sb = '<span id="thepaperlink_if' + pmid + '">';
  if (sa.indexOf('Among authors: ') === 0) {  // 2020-4-5
    sb = sa.substr(0, sa.indexOf('. ')+2) + sb;
    sa = sa.substr(sa.indexOf('. ')+2);
  }
  if (sa.indexOf(' 20') > 0) {
    sb += sa.substr(0, sa.indexOf('. 20')) +
          '</span>' + sa.substr(sa.indexOf('. 20')+1);
  } else if (sa.indexOf('. 19') > 0 || sa.indexOf('. 18') > 0) {
    sb += sa.substr(0, sa.indexOf('. 1')) +
          '</span>' + sa.substr(sa.indexOf('. 1')+1);
  } else {
    window.alert('You are reading a really old article. ' + s);
    return s;
  }
  return sb;
}

function new_pubmed_multi(zone, num, ajax=false) {
  var ID, b, c, t_cont, t_title, t_strings;
  try {
    ID = byTag(zone)[num].getElementsByClassName('docsum-pmid')[0].textContent;
  } catch {
    return;
  }
  //if ( byID('clippy' + ID) ) {
  //  DEBUG && console.log('exist pmid', ID);
  //  return;
  //}
  if (pmidString.indexOf(ID) < 0) {
    pmidString += ',' + ID;
  }
  t_title = trim( byTag(zone)[num].parentNode.getElementsByTagName('a')[0].textContent );
  if (t_title[t_title.length-1] !== '.') {
    t_title += '.';
  }
  var authors_str = trim( byTag(zone)[num].getElementsByClassName('full-authors')[0].textContent ), authors_list;
  byTag(zone)[num].removeChild(
    byTag(zone)[num].getElementsByClassName('full-authors')[0] );
  byTag(zone)[num].removeChild(
    byTag(zone)[num].getElementsByClassName('short-journal-citation')[0] );
  t_strings = trim( byTag(zone)[num].textContent ).replace( /\s\s+/g, ' ' );
  if (t_strings.indexOf('No authors listed') < 0 &&
      byTag(zone)[num].getElementsByClassName('short-authors')[0].textContent !== '' ) {
    t_cont = t_title + '\r\n' +
             authors_str + '\r\n' +
             t_strings.substr(t_strings.indexOf('. ')+2);  // t_strings.substr(0, t_strings.indexOf('. '))
  } else {
    t_cont = t_title + '\r\n' + t_strings;
  }
  if (t_strings.indexOf('Free PMC article.') > 0) {
    t_cont = trim( t_cont.split('Free PMC article.')[0] );
  }
  if (t_strings.indexOf('Review.') > 0) {
    t_cont = trim( t_cont.split('Review.')[0] );
  }
  if (t_strings.indexOf('Online ahead of print.') > 0) {
    t_cont = t_cont.replace(/ Online ahead of print\./, '');
  }
  DEBUG && console.log('t_cont', t_cont);
  a_proxy({a_pmid: ID, a_title: t_title}); // queue_scholar_title

  byTag(zone)[num].parentNode.parentNode.getElementsByClassName('result-actions-bar')[0].id = 'tpl'+ID;

  var peakss, found_click = '<span class="paperlink2_found">';  //@@@@ <b> authors or journal
  if (ajax) {
    found_click = '<span class="paperlink2_found" onclick="showPeaks(this)">';
  }
  if (t_strings.indexOf('No authors listed') > -1 ||
      byTag(zone)[num].getElementsByClassName('short-authors')[0].textContent === '') {
    byTag(zone)[num].innerHTML = '[No authors listed] ' + id_journal( t_strings.substr(20), ID);
  } else if (t_strings.toLowerCase().indexOf('working group') > -1 ||
             t_strings.toLowerCase().indexOf(' committee') > 0 ||
             t_strings.toLowerCase().indexOf(' association') > 0 ||
             t_strings.toLowerCase().indexOf(' team') > 0 ||
             t_strings.toLowerCase().indexOf(' office') > 0 ||
             t_strings.toLowerCase().indexOf('society of ') > -1 ||
             t_strings.toLowerCase().indexOf('group of ') > -1 ) {
    byTag(zone)[num].innerHTML = trim( t_strings.substr(0, t_strings.indexOf('. ')) ) +
                                   '. ' + id_journal( t_strings.substr(t_strings.indexOf('. ')+2), ID);
  } else {
    if (t_strings.indexOf(', et al.') > 0) {
      peakss = t_strings.split(', et al.') ;
      var authors_list = authors_str.substr(0, authors_str.length-1).split(', ');
      byTag(zone)[num].innerHTML = found_click + peakss[0] +
                                   '</span>, &hellip;, <span class="paperlink2_found" onclick="showPeaks(this)">' +
                                   authors_list[authors_list.length-1] +
                                   '</span>. ' + id_journal( peakss[1], ID);
    } else if (t_strings.indexOf(' and ') > 0) {
      peakss = t_strings.split(' and ') ;
      byTag(zone)[num].innerHTML = found_click + peakss[0] +
                                   '</span> and ' + found_click +
                                   peakss[1].substr(0, peakss[1].indexOf('. ')) +
                                   '</span>. ' + id_journal( peakss[1].substr(peakss[1].indexOf('. ')+2), ID);
    } else {
      byTag(zone)[num].innerHTML = found_click + t_strings.substr(0, t_strings.indexOf('. ')) +
                                   '</span>. ' + id_journal( t_strings.substr(t_strings.indexOf('. ')+2), ID);
    }
  }
  b = page_d.createElement('div');
  b.setAttribute('style', 'float:right;z-index:1;cursor:pointer');
  b.innerHTML = '&nbsp;<img class="pl4_clippy" title="copy to clipboard" src="' + clippy_file +
      '" alt="copy" width="14" height="14" />';
  b.id = 'clippy' + ID;
  b.onclick = function () { a_proxy({t_cont: t_cont}); };
  byTag(zone)[num].appendChild(b);

  c = page_d.createElement('span');
  c.setAttribute('style', 'font-size:11px');
  c.innerHTML = '<span id="citedBy' + ID + '">...</span>';
  byTag(zone)[num].parentNode.getElementsByClassName('labs-docsum-snippet')[0].appendChild(c);
}

function prep_call(pmids) {
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
    if (ele.className.indexOf('result_count') === 0) {
      need_insert = 0;
      ele.id = 'pl4_title';
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
  if (need_insert && !byID('pl4_title')) {
    ele = page_d.createElement('h2');
    ele.innerHTML = loading_span;
    ele.id = 'pl4_title';
    if ( byID('messagearea') ) {
      byID('messagearea').appendChild(ele);
    } else if ( byID('full-view-heading') ) {
      byID('full-view-heading').appendChild(ele);
    } else if ( byClassOne('results-amount-container') ) {
      byClassOne('results-amount-container').appendChild(ele);
    }
  }
  onePage_calls += 1;
  a_proxy({url: url}); // call theServer api
}

function parse_page_div(ajax=true) {
  var i, len, z;
  try {
    if (byID('id_term') !== null) {
      search_term = trim( byID('id_term').value );  // 2020-2-4
    } else {
      search_term = trim( byID('term').value );  // 2013-3-26, 2018-9-14
    }
  } catch (err) {
    DEBUG && console.log('search_term', err);
  }
  a_proxy({reset_counts: 1});
  for (i = 0, len = byTag('div').length; i < len; i += 1) {
    if (byTag('div')[i].className === 'rprt' || byTag('div')[i].className === 'rprt abstract') {
      legacy_pubmed('div', i);
    } else if (byTag('div')[i].className === 'article-source') {
      new_pubmed_single();  // 2020-2-4
      break;
    } else if (byTag('div')[i].className.indexOf('full-citation') > 0) {  // 2020-4-2
      if (ajax) {
        new_pubmed_multi('div', i, ajax);  // 2020-2-5
      } else {
        new_pubmed_multi('div', i);
      }
      absNeeded = 1;  // 2020-2-4
    }
  }
  if (byClassOne('load-button next-page') && !byID('tpl_load_next')) {
    byClassOne('load-button next-page').getElementsByTagName('span')[0].id = 'tpl_load_next';
    byID('tpl_load_next').onclick = function () {
      pmidString = '';
      byID('tpl_manual_ajax_next').removeAttribute('class');
      setTimeout(parse_page_div, 5000);  // arbitrary
    };
    z = page_d.createElement('span');
    z.innerHTML = '&nbsp;<img src="' + loading_gif + '" width="16" height="11" alt="loading" />';
    z.id = 'tpl_manual_ajax_next';
    byID('tpl_load_next').parentNode.appendChild(z);
  }
  if (byClassOne('load-button prev-page') && !byID('tpl_load_prev')) {
    byClassOne('load-button prev-page').getElementsByTagName('span')[0].id = 'tpl_load_prev';
    byID('tpl_load_prev').onclick = function () {
      pmidString = '';
      byID('tpl_manual_ajax_prev').removeAttribute('class');
      setTimeout(parse_page_div, 5000);  // arbitrary
    };
    z = page_d.createElement('span');
    z.innerHTML = '&nbsp;<img src="' + loading_gif + '" width="16" height="11" alt="loading" />';
    z.id = 'tpl_manual_ajax_prev';
    byID('tpl_load_prev').parentNode.appendChild(z);
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
    prep_call(pmidString);
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
          DEBUG && console.log('alert_dev', oXHR.statusText);
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

function get_request(msg) {
  DEBUG && console.log('get_request', msg);
  if (byID('tpl_manual_ajax_next') !== null) {  // 2020-2-4
    byID('tpl_manual_ajax_next').setAttribute('class', 'thepaperlink_Off');
  }
  if (byID('tpl_manual_ajax_prev') !== null) {  // 2020-2-4
    byID('tpl_manual_ajax_prev').setAttribute('class', 'thepaperlink_Off');
  }
  if (msg.local_mirror) {
    local_mirror = msg.local_mirror;
    //sendResponse({});
    return;

  } else if (msg.except) {
    if (!search_term && page_url.indexOf('/pubmed/') > 0) {
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
        byID('citedBy' + msg.pmid).textContent = 'trying';
      } else if (msg.g_num === 0 && msg.g_link === 0) {
        byID('citedBy' + msg.pmid).innerHTML = '<i>Really? No citation yet. Is it a very recent publication?</i>';
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0 ||
            page_url.indexOf('://pubmed.ncbi.nlm.nih.gov/') > 0) {  // 2020-2-4
          byID('citedBy' + msg.pmid).parentNode.setAttribute('class', 'thepaperlink_Off');
        }
      } else if (msg.g_num && msg.g_link) {
        byID('citedBy' + msg.pmid).innerHTML = '<a target="_blank" href="https://scholar.google.com' +
          msg.g_link + '">Google Scholar ' + msg.g_num + ' times</a>';
      }
    } catch (err) {
      DEBUG && console.log('g_scholar', err);
      byID('citedBy' + msg.pmid).parentNode.setAttribute('class', 'thepaperlink_Off');
    }
    //sendResponse({});
    return;

  } else if (msg.Off_id) {
    if (byID(msg.Off_id) !== null) {
      byID(msg.Off_id).setAttribute('class', 'thepaperlink_Off');
    }

  } else if (msg.el_id && msg.el_data) { // _pdf, pl4_scopus, _shark
    try {
      if (msg.el_data && msg.el_data.indexOf('://') > -1) {
        if (page_url.indexOf('://www.ncbi.nlm.nih.gov/') > 0 ||
            page_url.indexOf('://pubmed.ncbi.nlm.nih.gov/') > 0) {  // 2020-2-4
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
      } else if (msg.el_data === 1 &&
          page_url.indexOf('://www.ncbi.nlm.nih.gov/') === -1 &&
          page_url.indexOf('://pubmed.ncbi.nlm.nih.gov/') === -1) {  // 2020-2-4
        byID(msg.el_id).textContent = 'trying';
      } else {
        byID(msg.el_id).textContent = msg.el_data;
      }
    } catch (err) {
      DEBUG && console.log('el_data', err);
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
    window.alert(msg.returnAbs);
    if (byID('thepaperlink_text' + msg.pmid) !== null) {
      byID('thepaperlink_text' + msg.pmid).style.display = 'block';
      byID('thepaperlink_text' + msg.pmid).value = msg.returnAbs;
      byID('thepaperlink_abs' + msg.pmid).style.display = 'none';
    } else {
      byID('thepaperlink_abs' + msg.pmid).textContent = 'abstract';
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
    div_html = '<a class="thepaperlink-home" href="' + msg.uri + '/:' + msg.pmid +
               '" target="_blank">the paper link</a>';
    div_html += msg.extra;
    div.innerHTML = div_html;
    if (byID(msg.to_other_sites).textContent === ' the paper link') {
      byID(msg.to_other_sites).innerHTML = '';
    }
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
  if (msg.pubmeder) {  //@@@@
    bookmark_div += '<span id="thepaperlink_saveAll" class="' + pmidString + '">save&nbsp;page</span></div>';
  } else {
    bookmark_div += 'save what you are reading? try <a href="https://pubmeder-hrd.appspot.com/registration" target="_blank">PubMed-er</a></div>';
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
    if (byID('pl4_once_' + pmid) !== null) {
      continue;
    }
    div = page_d.createElement('div');
    div.className = 'thepaperlink';
    div_html = '<a class="thepaperlink-home" id="pl4_once_' + pmid + '" href="' +
               msg.uri + '/:' + pmid + '" target="_blank">the paper link</a>: ';
    var slfoV = parseFloat(r.item[i].slfo);
    if (r.item[i].slfo && r.item[i].slfo !== '~' && slfoV > 0) {
      var impact3 = byID('thepaperlink_if' + pmid);
      if (impact3 !== null) {
        var i3t = impact3.textContent,
            i3s = page_d.createElement('span');
        impact3.style.border = '1px #e0ecf1 solid';
        i3s.innerHTML = '<span style="background:#e0ecf1;padding:0 1px 0 1px">' + r.item[i].slfo + '</span>';
        if (i3t.indexOf(' Actions') > 0) {  // new abstract page, 2020-2-23
          impact3.textContent = i3t.replace( /^\s+/, '' ).split(' Actions')[0];
        } else if (i3t.indexOf('.') > 0){   // legacy abstract page
          impact3.textContent = i3t.replace( /\.$/, '' );
        }
        impact3.appendChild(i3s);
      } else {
        tmp = '<span>impact<i style="font-size:75%">' + uneval_trim(r.item[i].slfo) + '</i></span>';
        div_html += tmp;
      }
    }
    if (absNeeded) { //@@@@ 2018 Sep
      tmp = '<span class="thepaperlink-abs" id="thepaperlink_abs' + pmid + '">abstract</span>';
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
          '#" target="_blank">&#8623;</a>';
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
          '" target="_blank">&#8623;</a>';
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
    if (msg.pubmeder || msg.cloud_op) { // @@@@
      tmp = '<span id="thepaperlink_save' + pmid +
          '" class="thepaperlink-home">save</span>';
      div_html += tmp;
    }
    if (msg.tpl) { // 2019-1-30 re-write
      tmp = '<span id="thepaperlink_rpt' + pmid +
          '" class="thepaperlink-home">&hellip;</span>';
      div_html += tmp;
    }
    div.innerHTML = div_html;
    if (byID('tpl'+pmid) !== null) {
      byID('tpl'+pmid).appendChild(div);
    } else {
      window.alert('PMID ' + pmid + ' is missing :-p'); // 2020-2-4
      break;
    }
    k += 1;

    if (msg.tpl && byID('thepaperlink_rpt' + pmid) !== null) {
      byID('thepaperlink_rpt' + pmid).onclick = function () {
        byID(this.id).innerHTML = '&nbsp;<br/>&nbsp;&nbsp;';
        var moneyEmail, moneyError, moneyMore;
        moneyEmail = page_d.createElement('span');
        moneyEmail.textContent = 'email';
        moneyEmail.id = 'thepaperlink_A' + pmid;
        moneyEmail.className = 'thepaperlink-home';
        moneyMore = page_d.createElement('span');
        moneyMore.textContent = 'more info?';
        moneyMore.id = 'thepaperlink_C' + pmid;
        moneyMore.className = 'thepaperlink-home';
        if (byID('thepaperlink_pdf' + pmid) !== null) {
          moneyError = page_d.createElement('span');
          moneyError.textContent = 'wrong link?';
          moneyError.id = 'thepaperlink_B' + pmid;
          moneyError.className = 'thepaperlink-home';
          byID(this.id).parentNode.appendChild(moneyEmail);
          byID('thepaperlink_A' + pmid).onclick = function () {
            var a = this.id.substr(14),
                b = {money_emailIt: a,
                     pdf: byID('thepaperlink_pdf' + a).href};
            if (byID('thepaperlink_doi' + a) !== null) {
              b.doi = byID('thepaperlink_doi' + a).href.substr(18);
            }
            a_proxy(b);
          };
          byID(this.id).parentNode.appendChild(moneyError);
          byID('thepaperlink_B' + pmid).onclick = function () {
            a_proxy({money_reportWrongLink: this.id.substr(14)});
          };
          byID(this.id).parentNode.appendChild(moneyMore);
          byID('thepaperlink_C' + pmid).onclick = function () {
            a_proxy({money_needInfo: this.id.substr(14)});
          };
        } else {
          byID(this.id).parentNode.appendChild(moneyEmail);
          byID('thepaperlink_A' + pmid).onclick = function () {
            a_proxy({money_emailIt: this.id.substr(14)});
          };
          byID(this.id).parentNode.appendChild(moneyMore);
          byID('thepaperlink_C' + pmid).onclick = function () {
            a_proxy({money_needInfo: this.id.substr(14)});
          };
        }
      };
    }

    if (byID('thepaperlink_save' + pmid) !== null) {
      byID('thepaperlink_save' + pmid).onclick = function () {
        a_proxy({saveIt: this.id.substr(17)});
        byID(this.id).setAttribute('class', 'thepaperlink_Off');
      };
    }
    if (byID('thepaperlink_saveAll') !== null) {
      byID('thepaperlink_saveAll').onclick = function () {
        a_proxy({saveIt: this.className});
        byID(this.id).parentNode.setAttribute('class', 'thepaperlink_Off');
      };
    }

    if (byID('thepaperlink_abs' + pmid) !== null) {
      byID('thepaperlink_abs' + pmid).onclick = function () {
        byID(this.id).textContent = 'trying';
        a_proxy({ajaxAbs:this.id.substr(16)});
      };
      if (!slfoV || slfoV < 2.0) {
        byID('thepaperlink_abs' + pmid).parentNode.style.opacity = 0.3333;
      } else if ((slfoV && slfoV > 9.9) || (r.item[i].f_v && r.item[i].fid)) {  //@@@@
        byID('tpl'+pmid).style.paddingTop = '10px';
        var barText = page_d.createElement('textarea');
        barText.style.display = 'none';
        barText.id = 'thepaperlink_text' + pmid;
        barText.className = 'thepaperlink-text';
        byID('tpl'+pmid).appendChild(barText);
        if (slfoV > 30.0) {
            byID('tpl'+pmid).style.borderRight = '6px solid yellow';
        } else if (slfoV > 20.0) {
            byID('tpl'+pmid).style.borderRight = '3px solid yellow';
        } else {
            byID('tpl'+pmid).style.borderRight = '3px solid #e0ecf1';
        }
      }
    }

  } // for loop r.count
  if (pmidArray.length > 0 && onePage_calls) { // && onePage_calls < 10
    if (pmidArray.length === k) {
      DEBUG && console.log('got nothing; stopped. ' + k);
    } else {
      DEBUG && console.log('call for ' + k + ', not get ' + pmidArray.length);
      byID('pl4_title').innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' +
          loading_gif + '" width="16" height="11" alt="loading" />';
      onePage_calls += 1; // @@@@
      a_proxy({url: '/api?a=chrome2&pmid=' + pmidArray.join(',') + '&apikey='});
    }
  }
  DEBUG && console.log('onePage_calls', onePage_calls);
  //sendResponse({});
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
} else if (page_url.indexOf('://pubmed.ncbi.nlm.nih.gov/') === -1
        && page_url.indexOf('://www.ncbi.nlm.nih.gov/pubmed') === -1
        && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&') === -1
        && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez') === -1) { // content_scripts, externally_connectable
  var ID = parse_id(page_d.body.textContent) || parse_id(page_d.body.innerHTML);
  if (ID !== null && ID[1] !== '999999999') {
    DEBUG && console.log('other site ID', ID[1]);
    a_proxy({sendID: ID[1]});
  }
  noRun = 1;
}
if (byID('ta_ad_title') !== null && byID('ta_ad_title').textContent.indexOf(
    'records with recent increases') > 0) {
  process_pubmedTrending();
  noRun = 99;
}
if (byID('_thepaperlink_client_status') !== null) { // noRun = 2
  byID('_thepaperlink_client_status').innerHTML = chrome.runtime.id;
}
if (byID('_thepaperlink_client_modify_it') !== null) { // noRun = 2
  byID('_thepaperlink_client_modify_it').innerHTML = 'the browser you are using is good for that';
}
if (!noRun) {
  chrome.storage.sync.get(['rev_proxy'], function (e) {
    var jss_base = 'https://www.thepaperlink.com/';
    if (e.rev_proxy && e.rev_proxy === 'yes') {
      jss_base = 'https://www.thepaperlink.cn/';
    }
    if (!byID('paperlink2_display')) {  //@@@@ 32stop.png
      var extension_la = document.createElement('script');
      extension_la.setAttribute('type', 'text/javascript');
      extension_la.setAttribute('src', jss_base + '/jss?y=' + (Math.random()));
      page_d.body.appendChild(extension_la);
    }
  });
  parse_page_div(false); // big boss, onload not ajax
}
//chrome.extension.onRequest.addListener(get_request);
_port && _port.onMessage.addListener(get_request);
_port && chrome.runtime.onMessage.addListener(get_request); // msg from b_proxy