"use strict";

chrome.storage.sync.get(['GUEST_APIKEY', 'thepaperlink_apikey',
                         'rev_proxy', 'https_failed'], function (e) {
    var js_base = 'https://www.thepaperlink.com/';
    if (e.https_failed || (e.rev_proxy && e.rev_proxy === 'yes')) {
      js_base = 'https://www.zhaowenxian.com/';
    }
    localStorage.setItem('thePaperLink_pubget_js_key', e.thepaperlink_apikey || e.GUEST_APIKEY);
    localStorage.setItem('thePaperLink_pubget_js_base', js_base);
    // will be removed by /js?
    if (!document.getElementById('__tr_display')) {
        var jsClient = document.createElement('script');
        jsClient.setAttribute('type', 'text/javascript');
        jsClient.setAttribute('src', js_base + 'js?y=' + (Math.random()));
        (document.head || document.documentElement).appendChild(jsClient);
    }
});

// 2018-9-28: pubmed.cn or.nsfc.gov.cn
// 2018-10-4: complete check with sync.get values