'use strict';

chrome.storage.sync.get(['GUEST_APIKEY', 'thepaperlink_apikey',
  'rev_proxy'], function (e) {
  let js_base = 'https://www.thepaperlink.com/';
  if (e.rev_proxy && e.rev_proxy === 'yes') {
    js_base = 'https://www.thepaperlink.cn/';
  }
  localStorage.setItem('thePaperLink_pubget_js_key', e.thepaperlink_apikey || e.GUEST_APIKEY);
  localStorage.setItem('thePaperLink_pubget_js_base', js_base);
  // removed 2020-6-28 v2.9.31
  if (!document.getElementById('__tr_display')) {
    const jsClient = document.createElement('script');
    jsClient.setAttribute('type', 'text/javascript');
    jsClient.setAttribute('src', js_base + 'js?y=' + (Math.random()));
    (document.head || document.documentElement).appendChild(jsClient);
  }
});

// 2018-9-28: pubmed.cn or.nsfc.gov.cn
// 2018-10-4: complete check with sync.get values
