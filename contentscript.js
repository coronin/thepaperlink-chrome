/*
 * Copyright (c) 2011 Liang Cai . All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 *
 * http://cail.cn
 * modified from my UserScript for GreaseMonkey Firefox, http://userscripts.org/scripts/show/97865
 */

function t(n) { return document.getElementsByTagName(n); }
function $(d) { return document.getElementById(d); }
function a_proxy(data) {
  console.log('sendRequest to background.html');
  chrome.extension.sendRequest(data);
}
var noRun = 0;

// storage data for access the api server
if (document.URL === 'http://thepaperlink.appspot.com/reg' || document.URL === 'https://thepaperlink.appspot.com/reg') {
  var apikey = $('apikey').innerHTML;
  a_proxy({thepaperlink_apikey: apikey});
  noRun = 1;
}
// storage data for access the bookmark server
if (document.URL === 'http://pubmeder.appspot.com/registration' || document.URL === 'https://pubmeder.appspot.com/registration') {
  var email = $('currentUser').innerHTML;
  var apikey = $('apikey_pubmeder').innerHTML;
  a_proxy({pubmeder_apikey: apikey, pubmeder_email: email});
  noRun = 1;
}

var pmids = '';
var pmidArray = [];
var old_title = '';
var title_pos = 0;
var search_term = '';

function getPmid(zone, num) {
  var a = t(zone)[num].textContent, regpmid = /PMID:\s(\d+)\s/, ID;
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num].className === 'rprt_all') {
        t(zone)[num - 1].setAttribute('id', ID[1]);
      } else {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      }
      pmids += ',' + ID[1];
    }
  }
}

function get_Json(pmids) {
  var i, url = '/api?flash=yes&a=chrome&pmid=' + pmids;
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0; i < t('h2').length; i += 1) {
    if (t('h2')[i].className === 'result_count') {
      old_title = t('h2')[i].innerHTML;
      title_pos = i;
      t('h2')[i].innerHTML = old_title + '<span style="font-weight:normal;font-style:italic"> ... loading data from "the Paper Link"</span>&nbsp;&nbsp;<img src="https://thepaperlink.appspot.com/static/loadingLine.gif" width="16" height="11" alt="loading icon on the server" />';
    }
  }
  a_proxy({url: url});
}

function run() {
  var i, s;
  for (i = 0; i < t('div').length; i += 1) {
    if (t('div')[i].className === 'rprt' && t('div')[i].className !== 'abstract') {
      getPmid('div', i);
    } else if (t('div')[i].className === 'rprt_all') {
      getPmid('div', i);
    } else if (t('div')[i].className === 'print_term') {
      z = t('div')[i].textContent;
      if (z) {
        search_term = z.substr(8, z.length);
      }
    }
  }
  pmids = pmids.substr(1, pmids.length);
  pmidArray = pmids.split(',');
  if (pmids) {
    get_Json(pmids);
  }
  if (!$('paperlink2_display')) {
    s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', 'https://paperlink2.appspot.com/js?y=' + (Math.random()));
    document.body.appendChild(s);
  }
}
run();

chrome.extension.onRequest.addListener(
  function (request, sender, sendResponse) {
    if (request.except) {
      t('h2')[title_pos].innerHTML = old_title + ' <span style="font-weight:normal;color:red">error in "the Paper Link" <button onclick="window.location.reload();">reload</button></span>';
      return;
    }
    var div, i, j, k, S, r = request.r, styles = '.thepaperlink {'
      + '  background: #e0ecf1;'
      + '  border:2px solid #dedede; border-top:2px solid #eee; border-left:2px solid #eee;'
      + '  padding: 2px 4px;'
      + '  border-radius: 4px;'
      + '  display: inline-block'
      + '}'
      + '.thepaperlink > a ,'
      + '.thepaperlink > span {'
      + '  margin: 0 6px'
      + '}'
      + 'a.thepaperlink-green {'
      + '  color: green'
      + '}'
      + 'a.thepaperlink-red {'
      + '  color: red'
      + '}'
      + '.thepaperlink-home {'
      + '  color: grey;'
      + '  text-decoration: none;'
      + '  cursor: pointer'
      + '}', bookmark_div = '<div id="css_loaded"></div>';
    if (request.tail) {
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal"><span id="thepaperlink_saveAll" onclick="saveIt(\'' + pmids + '\',\'' + request.save_key + '\',\'' + request.save_email + '\')">pubmeder&nbsp;all</span></div>';
    }
    if (!$('css_loaded')) {
      S = document.createElement('style');
      S.type = 'text/css';
      S.appendChild(document.createTextNode(styles));
      document.body.appendChild(S);
      //GM_addStyle(styles);
    }
    if (request.tail && old_title) {
      t('h2')[title_pos].innerHTML = old_title + bookmark_div;
    } else {
      t('h2')[title_pos].innerHTML = old_title;
    }
    for (i = 0; i < r.count; i += 1) {
      div = document.createElement('div');
      div.className = 'thepaperlink';
      div.innerHTML = '<a class="thepaperlink-home" href="http://thepaperlink.appspot.com/?q=pmid:' + r.item[i].pmid + '" target="_blank">the Paper Link</a>: ';
      if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
        div.innerHTML += '<span>impact&nbsp;' + r.item[i].slfo + '</span>';
      }
      if (r.item[i].pdf) {
        div.innerHTML += '<a id="thepaperlink_pdf' + r.item[i].pmid + '" class="thepaperlink-green" href="' + r.item[i].pdf + '" target="_blank">direct&nbsp;pdf</a>';
      }
      if (r.item[i].pmcid) {
        div.innerHTML += '<a id="thepaperlink_pmc' + r.item[i].pmid + '" href="https://www.ncbi.nlm.nih.gov/pmc/articles/' + r.item[i].pmcid + '/?tool=thepaperlinkClient" target="_blank">free&nbsp;article</a>';
      }
      if (r.item[i].doi) {
        div.innerHTML += '<a id="thepaperlink_doi' + r.item[i].pmid + '" href="http://dx.doi.org/' + r.item[i].doi + '" target="_blank">external&nbsp;page</a>';
      }
      if (r.item[i].f_v && r.item[i].fid) {
        div.innerHTML += '<a id="thepaperlink_f' + r.item[i].pmid + '" class="thepaperlink-red" href="http://f1000.com/' + r.item[i].fid + '" target="_blank">f1000&nbsp;score&nbsp;' + r.item[i].f_v + '</a>';
      }
      if (request.tail) {
        div.innerHTML += '<span id="thepaperlink_save' + r.item[i].pmid + '" onclick="saveIt(\'' + r.item[i].pmid + '\',\'' + request.save_key + '\',\'' + request.save_email + '\')">pubmeder&nbsp;it</span>';
      }
      if (request.tpl) {
        div.innerHTML += '<span id="thepaperlink_rpt' + r.item[i].pmid + '" class="thepaperlink-home" onclick="show_me_the_money(\'' + r.item[i].pmid + '\',\'' + request.tpl + '\')">?</span>';
      }
      if (request.tpl && r.item[i].pdf) {
        div.innerHTML += '<span style="display:none !important;" id="thepaperlink_hidden' + r.item[i].pmid + '"></span>';
      }
      $(r.item[i].pmid).appendChild(div);
      if ($('thepaperlink_hidden' + r.item[i].pmid)) {
        $('thepaperlink_hidden' + r.item[i].pmid).addEventListener('email_pdf', function () {
          var eventData = this.innerText, pmid = this.id.substr(19), pdf = $('thepaperlink_pdf' + pmid).href;
          $('thepaperlink_D' + pmid).innerText = '';
          a_proxy({upload_url: eventData, pdf: pdf, pmid: pmid, apikey: request.tpl});
        });
      }
      k = pmidArray.length;
      for (j = 0; j < k; j += 1) {
        if (r.item[i].pmid === pmidArray[j]) {
          pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
        }
      }
    }
    if (pmidArray.length > 0) {
      t('h2')[title_pos].innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="https://thepaperlink.appspot.com/static/loadingLine.gif" width="16" height="11" alt="loading icon on the server" />';
      a_proxy({url: '/api?pmid=' + pmidArray.join(',') + '&apikey='});
    }
    sendResponse({});
  }
);
