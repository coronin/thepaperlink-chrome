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

var noRun = 0;

if (document.URL === 'http://www.thepaperlink.com/reg'
    || document.URL === 'http://thepaperlink.appspot.com/reg'
    || document.URL === 'https://thepaperlink.appspot.com/reg'
    || document.URL === 'http://0.pl4.me/reg') { // storage data for access the api server
  var apikey = $('apikey').innerHTML;
  a_proxy({thepaperlink_apikey: apikey});
  noRun = 1;
} else if (document.URL === 'http://www.pubmeder.com/registration'
    || document.URL === 'http://pubmeder.appspot.com/registration'
    || document.URL === 'https://pubmeder.appspot.com/registration'
    || document.URL === 'http://1.pl4.me/registration') { // storage data for access the bookmark server
  var email = $('currentUser').innerHTML,
    apikey = $('apikey_pubmeder').innerHTML;
  a_proxy({pubmeder_apikey: apikey, pubmeder_email: email});
  noRun = 1;
} else if (document.URL.indexOf('://www.ncbi.nlm.nih.gov/pubmed') === -1 && document.URL.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&term=') === -1) {
  var ID = parse_id(document.body.innerText) || parse_id(document.body.innerHTML);
  if (ID !== null) {
    console.log('non-ncbi site, got ID ' + ID[1]);  
    a_proxy({sendID: ID[1]});
  } else {
    console.log('non-ncbi site, no ID found');  
  }
  noRun = 1;
}

var pmids = '',
  pmidArray = [],
  old_title = '',
  title_pos = 0,
  search_term = '';

function getPmid(zone, num) {
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, content, tmp, ii,
    swf_file = 'http://9.pl4.me/clippy.swf'; // chrome.extension.getURL('clippy.swf'); // bug 58907
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num].className === 'rprt_all') {
        t(zone)[num - 1].setAttribute('id', ID[1]);
      } else {
        t(zone)[num + 2].setAttribute('id', ID[1]);
        b = document.createElement('div');
        content = t(zone)[num + 2].innerText;
        tmp = content.split(' [PubMed - ')[0].split('.');
        for (ii = 0; ii < tmp.length; ii += 1) {
          if (ii === 0) {
            content = tmp[ii];
          //} else if (ii < 3) {
          //  content += '.\n' + tmp[ii];
          } else if (ii === tmp.length - 1) {
            content += '. [' + tmp[ii].substr(1) + ']';
          } else {
            content += '.' + tmp[ii];
          }
        }
        b.innerHTML = '<div style="float:right"><embed src="' + swf_file + '" width="110" height="14" quality="high" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" FlashVars="text=' + content + '" /></div>';
        t(zone)[num + 3].appendChild(b);
      }
      pmids += ',' + ID[1];
    }
  }
}

function get_Json(pmids) {
  var i,
    url = '/api?flash=yes&a=chrome&pmid=' + pmids,
    local_gif = chrome.extension.getURL('loadingLine.gif');
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0; i < t('h2').length; i += 1) {
    if (t('h2')[i].className === 'result_count') {
      old_title = t('h2')[i].innerHTML;
      title_pos = i;
      t('h2')[i].innerHTML = old_title + '<span style="font-weight:normal;font-style:italic"> fetching data from "the Paper Link"</span>&nbsp;&nbsp;<img src="' + local_gif + '" width="16" height="11" alt="loading" />';
    }
  }
  a_proxy({url: url});
}

function run() {
  var i, z;
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
}
run();

chrome.extension.onRequest.addListener(
  function (request, sender, sendResponse) {
    var r = request.r,
      div, i, j, k, S, styles, peaks,
      bookmark_div = '<div id="css_loaded"></div>';
    if (!$('paperlink2_display')) {
      peaks = document.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      if (request.uri === 'http://0.pl4.me') {
        peaks.setAttribute('src', 'http://2.pl4.me/js?y=' + (Math.random()));
      } else {
        peaks.setAttribute('src', 'https://paperlink2.appspot.com/js?y=' + (Math.random()));
      }
      document.body.appendChild(peaks);
    }
    if (request.except) {
      t('h2')[title_pos].innerHTML = old_title + ' <span style="font-size:14px;font-weight:normal;color:red">error in "the Paper Link" <button onclick="window.location.reload();">try reload?</button></span>';
      sendResponse({});
      return;
    }
    if (r.error) {
      t('h2')[title_pos].innerHTML = old_title + ' <span style="font-size:14px;font-weight:normal;color:red">"the Paper Link" error : ' + r.error + '</span>';
      sendResponse({});
      return;
    }
    styles = '.thepaperlink {'
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
      + '}';
    if (request.tail) {
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal;cursor:pointer"><span id="thepaperlink_saveAll" onclick="saveIt(\'' + pmids + '\',\'' + request.save_key + '\',\'' + request.save_email + '\')">pubmeder&nbsp;all</span></div>';
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
      div.innerHTML = '<a class="thepaperlink-home" href="' + request.uri + '/?q=pmid:' + r.item[i].pmid + '" target="_blank">the Paper Link</a>: ';
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
        div.innerHTML += '<span id="thepaperlink_save' + r.item[i].pmid + '" class="thepaperlink-home" onclick="saveIt(\'' + r.item[i].pmid + '\',\'' + request.save_key + '\',\'' + request.save_email + '\')">pubmeder&nbsp;it</span>';
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
          $('thepaperlink_D' + pmid).setAttribute('style', 'display:none');
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
      t('h2')[title_pos].innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' + request.uri + '/static/loadingLine.gif" width="16" height="11" alt="loading icon on the server" />';
      a_proxy({url: '/api?pmid=' + pmidArray.join(',') + '&apikey='});
    }
    sendResponse({});
    return;
  }
);
