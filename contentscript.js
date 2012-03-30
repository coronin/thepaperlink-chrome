/*
 * Copyright (c) 2012 Liang Cai . All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 *
 * http://cail.cn
 * initial version, a UserScript for GreaseMonkey Firefox, http://userscripts.org/scripts/show/97865
 */

var noRun = 0,
  page_d = document,
  page_url = page_d.URL,
  page_body = page_d.body,
  local_gif = chrome.extension.getURL('loadingLine.gif'),
  clippy_file = chrome.extension.getURL('clippyIt.png'),
  pmids = '',
  pmidArray = [],
  old_title = '',
  title_pos = 0,
  search_term = '',
  onePage_calls = 0;


if (typeof window.uneval === 'undefined') {
  window.uneval = function (a) {
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

function a_proxy(data) {
  //console.log('sendRequest to background.html');
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

function client_set() {
  if (page_url.indexOf('thepaperlink.com') > -1
    || page_url.indexOf('thepaperlink.net') > -1
    || page_url.indexOf('0.pl4.me') > -1
    || page_url.indexOf('thepaperlink.appspot.com') > -1
    || page_url.indexOf('pubget-hrd.appspot.com') > -1 ) {
    if ($('client_modify_it')) {
      $('client_modify_it').innerHTML = 'the browser you are using now is all set for that';
    }
  }
}

if (page_url === 'http://www.thepaperlink.com/reg'
    || page_url === 'http://www.thepaperlink.net/reg'
    || page_url === 'http://thepaperlink.appspot.com/reg'
    || page_url === 'https://thepaperlink.appspot.com/reg'
    || page_url === 'http://pubget-hrd.appspot.com/reg'
    || page_url === 'https://pubget-hrd.appspot.com/reg'
    || page_url === 'http://0.pl4.me/reg') { // storage data for access the api server
  var apikey = $('apikey').innerHTML,
    cloud_op = $('cloud_op').innerHTML;
  a_proxy({save_apikey: apikey, save_email: null});
  a_proxy({save_cloud_op: cloud_op});
  client_set();
  noRun = 1;
} else if (page_url === 'http://www.pubmeder.com/registration'
    || page_url === 'http://pubmeder.appspot.com/registration'
    || page_url === 'https://pubmeder.appspot.com/registration'
    || page_url === 'http://pubmeder-hrd.appspot.com/registration'
    || page_url === 'https://pubmeder-hrd.appspot.com/registration'
    || page_url === 'http://1.pl4.me/registration') { // storage data for access the bookmark server
  var email = $('currentUser').innerHTML,
    apikey = $('apikey_pubmeder').innerHTML;
  a_proxy({save_apikey: apikey, save_email: email});
  noRun = 1;
} else if (page_url.indexOf('://www.thepaperlink.com/oauth') > 0) {
  var content = $('r_content').innerHTML,
    service = $('r_success').innerHTML;
  a_proxy({service: service, content: content});
  noRun = 1;
} else if (page_url.indexOf('://www.ncbi.nlm.nih.gov/pubmed') === -1
    && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&') === -1
    && page_url.indexOf('://www.ncbi.nlm.nih.gov/sites/entrez') === -1) {
  var ID = parse_id(page_body.innerText) || parse_id(page_body.innerHTML);
  if (ID !== null && ID[1] !== '999999999') {
    //console.log('non-ncbi site, got ID ' + ID[1]);
    a_proxy({sendID: ID[1]});
  }
  client_set();
  noRun = 1;
}

function getPmid(zone, num) {
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, t_cont, t_strings, t_test;
  //console.log(a);
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num + 1].className === 'rprtnum') {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      } else {
        t(zone)[num - 2].setAttribute('id', ID[1]);
      }
      if (t(zone)[num].className === 'rprt') {
        t_cont = t(zone)[num + 2].innerText;
        t_strings = t_cont.split(' [PubMed - ')[0].split('.');
        t_cont = trim( t_strings[0] ) +
          '.\r\n' + trim( t_strings[1] ) +
          '.\r\n' + trim( t_strings[2] ) +
          '. ' + trim( t_strings[3] );
        t_test = trim( t_strings[t_strings.length - 1] );
        if (t_test.indexOf('[Epub ahead of print]') > -1) {
          t_cont += '. [' + trim( t_test.substr(21) ) + ']\r\n';
        } else {
          t_cont += '. [' + t_test + ']\r\n';
        }
        b = page_d.createElement('div');
        b.innerHTML = '<div style="float:right;z-index:1;cursor:pointer">'
          + '<img title="copy to clipboard" src="' + clippy_file
          + '" alt="copy" width="14" height="14" />&nbsp;&nbsp;</div>';
        b.onclick = function () {
          chrome.extension.sendRequest({t_cont: t_cont});
        };
        t(zone)[num + 3].appendChild(b);
      }
      pmids += ',' + ID[1];
    }
  }
}

function get_Json(pmids) {
  var i, div,
    need_insert = 1,
    url = '/api?flash=yes&a=chrome1&pmid=' + pmids,
    loading_span = '<span style="font-weight:normal;font-style:italic"> fetching data from "the Paper Link"</span>&nbsp;&nbsp;<img src="' + local_gif + '" width="16" height="11" alt="loading" />';
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0; i < t('h2').length; i += 1) {
    if (t('h2')[i].className === 'result_count') {
      old_title = t('h2')[i].innerHTML;
      title_pos = i;
      need_insert = 0;
      t('h2')[i].innerHTML = old_title + loading_span;
    }
  }
  if (need_insert) {
    div = page_d.createElement('h2');
    div.innerHTML = loading_span;
    $('messagearea').appendChild(div);
  }
  onePage_calls += 1;
  a_proxy({url: url});
}

function run() {
  var i, z;
  try {
    search_term = $('search_term').value;
  } catch (err) {
    console.log(err);
  }
  for (i = 0; i < t('div').length; i += 1) {
    if (t('div')[i].className === 'rprt' || t('div')[i].className === 'rprt abstract') { //  && t('div')[i].className !== 'abstract'
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
if (!noRun) {
  a_proxy({loadExtraJs: 1});
  run();
}

function alert_dev(apikey) {
  if (apikey && apikey !== 'G0oasfw0382Wd3oQ0l1LiWzE') {
   var oXHR = new XMLHttpRequest();
   oXHR.open('POST', 'http://0.pl4.me/?action=alert_dev&pmid=1&apikey=' + apikey, true);
   oXHR.onreadystatechange = function (oEvent) {
     if (oXHR.readyState === 4) {
       if (oXHR.status === 200) {
         $('thepaperlink_alert').innerHTML('&lt;!&gt; Just sent the alert.');
       } else {
         console.log('Error', oXHR.statusText);
     } }
   };
   oXHR.send(null);
  } else {
    alert('You have to be a registered user to be able to alert the developer.');
  }
}


chrome.extension.onRequest.addListener(
  function (request, sender, sendResponse) {
    var r, p, pmid, div, div_html, i, j, k, S, styles, peaks,
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal;cursor:pointer"> ';
    if (request.js_base_uri) {
      if (!$('paperlink2_display')) {
        peaks = page_d.createElement('script');
        peaks.setAttribute('type', 'text/javascript');
        peaks.setAttribute('src', request.js_base_uri + '/jss?y=' + (Math.random()));
        page_body.appendChild(peaks);
      }
      sendResponse({});
      return;
    } else if (request.except) {
      if (!search_term) {
        search_term = page_url.split('/pubmed/')[1];
      }
      if (!search_term) {
        search_term = localStorage.getItem('thePaperLink_ID');
      }
      t('h2')[title_pos].innerHTML = old_title +
        ' <span style="font-size:14px;font-weight:normal;color:red">Error! Try ' +
        '<button onclick="window.location.reload()">reload</button> or ' +
        '<b>Search</b> <a href="http://www.thepaperlink.com/?q=' + search_term +
        '" target="_blank">the Paper Link</a>' +
        '<span style="float:right;cursor:pointer" id="thepaperlink_alert">&lt;!&gt;</span></span>';
      t('h2')[title_pos].onclick = alert_dev(uneval(request.tpl), title_pos);
      sendResponse({});
      return;
    } else if (request.js_key && request.js_base) {
      if (window.location.protocol !== 'https:') {
        //console.log('starting the js client');
        localStorage.setItem('thePaperLink_pubget_js_key', request.js_key);
        localStorage.setItem('thePaperLink_pubget_js_base', request.js_base);
        if (!$('__tr_display')) {
          var jsClient = page_d.createElement('script');
          jsClient.setAttribute('type', 'text/javascript');
          jsClient.setAttribute('src', request.js_base + 'js?y=' + (Math.random()));
          page_body.appendChild(jsClient);
        }
      } else { alert('this is a secure page, js client not working yet'); }
      sendResponse({});
      return;
    } else if (request.pmid && request.cited_by) {
      $('citedBy' + request.pmid).innerHTML = request.cited_by;
      sendResponse({});
      return;
    }
    r = request.r;
    if (r.error) {
      t('h2')[title_pos].innerHTML = old_title +
        ' <span style="font-size:14px;font-weight:normal;color:red">"the Paper Link" error ' +
        uneval(r.error) + '</span>';
      sendResponse({});
      return;
    }
    p = uneval_trim(request.p);
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
    if (!$('css_loaded')) {
      S = page_d.createElement('style');
      S.type = 'text/css';
      S.appendChild(page_d.createTextNode(styles));
      page_body.appendChild(S);
      //GM_addStyle(styles);
    }
    if (request.pubmeder) {
      bookmark_div += '<span id="thepaperlink_saveAll onclick="saveIt_pubmeder(\'' +
        pmids + '\',\'' + uneval_trim(request.save_key) + '\',\'' +
        uneval_trim(request.save_email) + '\')">pubmeder&nbsp;all</span></div>';
    } else {
      bookmark_div += 'Wanna save what you are reading? Login<a href="http://www.pubmeder.com/registration" target="_blank">PubMed-er</a></div>';
    }
    if (old_title) {
      t('h2')[title_pos].innerHTML = old_title + bookmark_div;
    } else {
      t('h2')[title_pos].innerHTML = '';
    }
    for (i = 0; i < r.count; i += 1) {
      pmid = uneval_trim(r.item[i].pmid);
      div = page_d.createElement('div');
      div.className = 'thepaperlink';
      div_html = '<a class="thepaperlink-home" href="http://www.thepaperlink.com/?q=pmid:' +
        pmid + '" target="_blank">the Paper Link</a>: ';
      if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
        div_html += '<span>impact&nbsp;' + uneval_trim(r.item[i].slfo) + '</span>';
      }
      if (r.item[i].pdf) {
        div_html += '<a id="thepaperlink_pdf' + pmid +
          '" class="thepaperlink-green" href="' + p + uneval_trim(r.item[i].pdf) +
          '" target="_blank">direct&nbsp;pdf</a>';
      }
      if (r.item[i].pmcid) {
        div_html += '<a id="thepaperlink_pmc' + pmid +
          '" href="https://www.ncbi.nlm.nih.gov/pmc/articles/' +
          uneval_trim(r.item[i].pmcid) + '/?tool=thepaperlinkClient" target="_blank">open&nbsp;access</a>';
      }
      if (r.item[i].doi) {
        div_html += '<a id="thepaperlink_doi' + pmid +
          '" href="' + p + 'http://dx.doi.org/' + uneval_trim(r.item[i].doi) +
          '" target="_blank">publisher</a>';
      } else if (r.item[i].pii) {
        div_html += '<a id="thepaperlink_doi' + pmid +
          '" href="' + p + 'http://linkinghub.elsevier.com/retrieve/pii/' +
          uneval_trim(r.item[i].pii) + '" target="_blank">publisher</a>';
      }
      if (r.item[i].f_v && r.item[i].fid) {
        div_html += '<a id="thepaperlink_f' + pmid +
          '" class="thepaperlink-red" href="' + p + 'http://f1000.com/' +
          uneval_trim(r.item[i].fid) + '" target="_blank">f1000&nbsp;score&nbsp;' +
          uneval_trim(r.item[i].f_v) + '</a>';
      }
      if (request.pubmeder || request.cloud_op) {
        div_html += '<span id="thepaperlink_save' + pmid +
          '" class="thepaperlink-home" onclick="saveIt(\'' + pmid +
          '\',\'' + uneval_trim(request.save_key) + '\',\'' + uneval_trim(request.save_email) + '\',\'' +
          uneval_trim(request.tpl) + '\',\'' + uneval_trim(request.cloud_op) + '\')">save&nbsp;it</span>';
      }
      if (request.tpl) {
        div_html += '<span id="thepaperlink_rpt' + pmid +
          '" class="thepaperlink-home" onclick="show_me_the_money(\'' +
          pmid + '\',\'' + uneval_trim(request.tpl) + '\')">&hellip;</span>';
      }
      if (request.tpl && r.item[i].pdf) {
        div_html += '<span style="display:none !important;" id="thepaperlink_hidden' +
          pmid + '"></span>';
      }
      div.innerHTML = div_html;
      $(r.item[i].pmid).appendChild(div);
      if ($('thepaperlink_hidden' + pmid)) {
        $('thepaperlink_hidden' + pmid).addEventListener('email_pdf', function () {
          var eventData = this.innerText,
            pmid = this.id.substr(19),
            pdf = $('thepaperlink_pdf' + pmid).href,
            no_email_span = $('thepaperlink_save' + pmid).className;
          if ( (' ' + no_email_span + ' ').indexOf(' no_email ') > -1 ) {
            a_proxy({upload_url: eventData, pdf: pdf, pmid: pmid, apikey: request.tpl, no_email: 1});
          } else {
            a_proxy({upload_url: eventData, pdf: pdf, pmid: pmid, apikey: request.tpl, no_email: 0});
            try {
              $('thepaperlink_D' + pmid).setAttribute('style', 'display:none');
            } catch (err) {
              console.log(err);
            }
          }
        });
      }
      k = pmidArray.length;
      for (j = 0; j < k; j += 1) {
        if (pmid === pmidArray[j]) {
          pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
        }
      }
    }
    if (pmidArray.length > 0 && onePage_calls < 10) {
      if (pmidArray.length === k) {
        console.log('Got nothing; stopped. ' + k);
      } else {
        //console.log('call for ' + k + ', not get ' + pmidArray.length);
        t('h2')[title_pos].innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' +
          local_gif + '" width="16" height="11" alt="loading" />';
        onePage_calls += 1;
        a_proxy({url: '/api?a=chrome2&pmid=' + pmidArray.join(',') + '&apikey='});
      }
    }
    console.log('onePage_calls: ' + onePage_calls);
    sendResponse({});
    return;
  }
);