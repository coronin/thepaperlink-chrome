"use strict";

var _port = chrome.runtime.connect({name: 'background_port'}),
    email_filter = /^[^@]+@[^@]+.[a-z]{2,}$/i,
    bkg = chrome.extension.getBackgroundPage();

function adjust_keywords() {
  var keyword_selected = '';
  $('input.keywords:checked').each(function () {
    keyword_selected += this.id.replace(/,,/g, '"');
    keyword_selected += '\n';
  });
  if (keyword_selected) {
    $('#keywords_area').text(keyword_selected);
    $('#keywords_area').removeClass('Off');
    $('#submit_keyword').removeClass('Off');
  } else {
    $('#keywords_area').text('');
    $('#keywords_area').addClass('Off');
    $('#submit_keyword').addClass('Off');
  }
}

function toggle_checked(obj,q) {
  if (obj.prop('checked')) {
    obj.prop('checked', false);
  } else {
    obj.prop('checked', true);
  }
  if (!q) {
    adjust_keywords();
  }
}

function get_end_num(str) {
  var suffix = ',';
  if (!str) { return 0; }
  try {
    return parseInt(str.substr(str.lastIndexOf(suffix) + 1), 10);
  } catch (err) {
    return 0;
  }
}

function reset_key(v) {
  var answer = window.confirm('\n do you really want to rest the key?\n');
  if (answer) {
    if (v === 1) {
      localStorage.removeItem('thepaperlink_apikey');
      localStorage.removeItem('a_apikey_gold');
    } else if (v === 2) {
      localStorage.removeItem('pubmeder_apikey');
      localStorage.removeItem('pubmeder_email');
      localStorage.removeItem('b_apikey_gold');
    }
    location.reload();
    //chrome.extension.sendRequest({load_common_values: 1});
    _port.postMessage({load_common_values: 1});
  }
}

function valid_thepaperlink(ak) {
  bkg.console.time("Call theServer to validate apikey");
  return $.get('https://www.zhaowenxian.com/api',
      { validate: ak,
         runtime: '' + chrome.runtime.id },
      function (txt) {
        if (txt === 'valid') {
          _port.postMessage({save_apikey: ak, save_email: null});
        } else {
          $.cookie('alert_v1', 'oops', {expires: 3});
        }
      }, 'json'
  ).always(function() {
    bkg.console.timeEnd("Call theServer to validate apikey");
  });
}

function valid_pubmeder(e,ak) {
  bkg.console.time("Call theServer to validate pubmeder");
  return $.get('https://1.zhaowenxian.com/input?pmid=999999999&apikey=' + ak + '&email=' + e,
      function (txt) {
        if (txt === 'correct') {
          _port.postMessage({save_apikey: ak, save_email: e});
        } else {
          $.cookie('alert_v2', 'oops', {expires: 3});
        }
      }, 'text'
  ).always(function() {
    bkg.console.timeEnd("Call theServer to validate pubmeder");
  });
}

function saveOptions() {
  var rev_proxy = $('#rev_proxy').prop('checked'),
      co_pubmed = $('#co_pubmed').prop('checked'),
      new_tab = $('#new_tab').prop('checked'),
      contextMenu_shown = $('#contextMenu_shown').prop('checked'),
      ws_items = $('#ws_items').prop('checked'),
      scholar_once = $('#scholar_once').prop('checked'),
      ajax_pii_link = $('#ajax_pii_link').prop('checked'),
      scihub_link = $('#scihub_link').prop('checked'),
      scihub_download = $('#scihub_download').prop('checked'),
      scihub_open_files = $('#scihub_open_files').prop('checked'),
      scihub_limit = $('#scihub_limit').val(),
      pubmed_limit = $('#pubmed_limit').val(),
      ezproxy_prefix = $('#ezproxy_input').val(),
      cc_address = $('#cc_address').val(),
      req_a = null,
      req_b = null,
      a;
  if (co_pubmed) {
    localStorage.setItem('co_pubmed', 'no');
  } else {
    localStorage.setItem('co_pubmed', 'yes');
  }
  if (new_tab) {
    localStorage.setItem('new_tab', 'yes');
  } else {
    localStorage.setItem('new_tab', 'no');
  }
  if (contextMenu_shown) {
    localStorage.setItem('contextMenu_shown', 'no');
    localStorage.removeItem('contextMenu_on');
    chrome.contextMenus.removeAll();
  } else {
    localStorage.setItem('contextMenu_shown', 'yes');
    if (!localStorage.getItem('contextMenu_on')) {
      localStorage.setItem('contextMenu_on', 1);
      //chrome.extension.sendRequest({menu_display: 1});
      _port.postMessage({menu_display: 1});
    }
  }
  if (ws_items) {
    localStorage.setItem('ws_items', 'yes');
    //chrome.extension.sendRequest({load_broadcast: 1});
    _port.postMessage({load_broadcast: 1});
  } else {
    localStorage.setItem('ws_items', 'no');
  }
  if (ws_items && scholar_once) {
    localStorage.setItem('scholar_once', 'yes');
  } else {
    localStorage.setItem('scholar_once', 'no');
  }
  if (rev_proxy) {
    localStorage.setItem('rev_proxy', 'yes');
    localStorage.setItem('scholar_once', 'yes'); // ws_items + route to google
  } else {
    localStorage.setItem('rev_proxy', 'no');
  }
  if (ajax_pii_link) {
    localStorage.setItem('ajax_pii_link', 'yes');
  } else {
    localStorage.setItem('ajax_pii_link', 'no');
  }
  if (scihub_link) {
    localStorage.setItem('scihub_link', 'yes');
    localStorage.setItem('scihub_open_files', 'no');
    if (scihub_download) {
      localStorage.setItem('scihub_download', 'yes');
      if (scihub_open_files) {
        localStorage.setItem('scihub_open_files', 'yes');
      }
    } else {
      localStorage.setItem('scihub_download', 'no');
    }
  } else {
    localStorage.setItem('scihub_link', 'no');
    localStorage.setItem('scihub_download', 'no');
    localStorage.setItem('scihub_open_files', 'no');
  }
  if (scihub_limit) {
    try {
      a = parseInt(scihub_limit, 10);
      if (a && a !== 3) {
        localStorage.setItem('scihub_limit', a);
      }
    } catch (err) {
      bkg.console.log(err);
    }
  }
  if (pubmed_limit) {
    try {
      a = parseInt(pubmed_limit, 10);
      if (a && a !== 10) {
        localStorage.setItem('pubmed_limit', a);
      }
    } catch (err) {
      bkg.console.log(err);
    }
  }
  if (ezproxy_prefix && (ezproxy_prefix.substr(0,7) === 'http://' || ezproxy_prefix.substr(0,8) === 'https://')) {
    localStorage.setItem('ezproxy_prefix', ezproxy_prefix);
  } else if (ezproxy_prefix && ezproxy_prefix.substr(0,1) === '.' && ezproxy_prefix.substr(1,1) !== '.') {
    var ezproxy_endswith = ezproxy_prefix.substr(-3,3).toLowerCase();
    if (ezproxy_endswith === 'edu' || ezproxy_endswith === 'net' || ezproxy_endswith === 'com' || ezproxy_endswith === 'org' || ezproxy_endswith === 'gov') {
      localStorage.setItem('ezproxy_prefix', ezproxy_prefix);
    } else {
      localStorage.setItem('ezproxy_prefix', '');
      window.alert('\n dot {prefix} has to end with .edu .net .com .org .gov\n');
      $('#ezproxy_input').focus();
      return false;
    }
  } else {
    if (ezproxy_prefix === '{prefix}') {
      ezproxy_prefix = '';
    }
    if (ezproxy_prefix) {
      window.alert('\n wrong format of the {prefix}\n please check with your librarian\n');
      $('#ezproxy_input').focus();
      return false;
    }
    localStorage.setItem('ezproxy_prefix', '');
  }
  if (cc_address && email_filter.test(cc_address)) {
    localStorage.setItem('cc_address', cc_address);
  } else {
    if (cc_address === '{cc address}') {
      cc_address = '';
    }
    if (cc_address) {
      window.alert('\n wrong format of the "' + cc_address + '"\n oops :-p\n');
      $('#cc_address').focus();
      return false;
    }
    localStorage.setItem('cc_address', '');
  }
  if ( !localStorage.getItem('a_apikey_gold') ) {
    var accessApi = $('#thepaperlink_apikey_input').val().replace( /\s+/g, '' );
    if (accessApi.length === 32) {
      req_a = valid_thepaperlink(accessApi);
    } else if (accessApi) {
      if (localStorage.getItem('rev_proxy') === 'yes') {
        window.alert('\n please provide a valid apikey to use the extension\n get it from https://www.zhaowenxian.com/reg\n');
      } else {
        window.alert('\n please provide a valid apikey to use the extension\n get it from http://www.thepaperlink.com/reg\n');
      }
      $('#thepaperlink_apikey_input').focus();
      return false;
    }
  }
  if ( !localStorage.getItem('b_apikey_gold') ) {
    var userEmail = $('#pubmeder_email_input').val(),
        userApi = $('#pubmeder_apikey_input').val().replace( /\s+/g, '' );
    if (userEmail && !email_filter.test(userEmail)) {
      window.alert('\n please provide a valid email address\n');
      $('#pubmeder_email_input').focus();
      return false;
    } else if (userEmail && (!userApi || userApi.length !== 32)) {
      if (localStorage.getItem('rev_proxy') === 'yes') {
        window.alert('\n please provide a valid apikey\n get it from https://1.zhaowenxian.com/registration\n');
      } else {
        window.alert('\n please provide a valid apikey\n get it from http://pubmeder.cailiang.net/registration\n');
      }
      $('#pubmeder_apikey_input').focus();
      return false;
    } else if (userEmail && userApi.length === 32) {
      req_b = valid_pubmeder(userEmail, userApi);
    }
  }
  if (req_a) {
    $.when(req_a).then(function () {
      location.reload();
    });
  } else if (req_b) {
    $.when(req_b).then(function () {
      location.reload();
    });
  } else if (req_a && req_b) {
    $.when(req_a, req_b).then(function () {
      location.reload();
    });
  } else {
    location.reload();
  }
  //chrome.extension.sendRequest({load_common_values: 1});
  _port.postMessage({load_common_values: 1});
}

// https://github.com/petele/IAPDemo/blob/master/scripts/app.js
function showLicense(license) { // @@@@
  bkg.console.log('showLicense', license);
  var modal = $('#modalLicense');
  modal.find('.license').text( JSON.stringify(license, null, 2) );
  modal.modal('show');
}
function onActionButton(evt) {
  var actionButton = $(evt.currentTarget);
  if ( actionButton.data('license') ) {
    showLicense( actionButton.data('license') );
  } else {
    buyProduct( actionButton.data('sku') );
  }
}
function onLicenseUpdate(dt) {
  bkg.console.log('onLicenseUpdate', dt);
  var licenses = dt.response.details,
      count = licenses.length, i;
  for (i = 0; i < count; i += 1) {
    addLicenseDataToProduct( licenses[i] );
  }
}
function onLicenseUpdateFailed(dt) {
  bkg.console.log('onLicenseUpdateFailed', dt);
}
function addProductToUI(product) {
  if (product.localeData[0].description === '@thepaperlink') {
    $('#donate_info').removeClass('Off');
    $('#xxxx').text('If you enjoy using the extension and want to support its development, you can ');
    var butAct1 = $('<button type="button"></button>').data('sku', product.sku).attr('id', 'IAP_' + product.sku).click(onActionButton).text('donate');
    $('#xxxx').append(butAct1);
  } else {
    var row = $('<tr></tr>'),
        colName = $('<td></td>').html('<b>' + product.localeData[0].title + '</b><br/><span style="color:#ccc">' + product.localeData[0].description + '</span>'),
        colPrice = $('<td></td>').text('$' + parseInt( product.prices[0].valueMicros, 10 ) / 1000000),
        butAct2 = $('<button type="button"></button>').data('sku', product.sku).attr('id', 'IAP_' + product.sku).click(onActionButton).text('Purchase'),
        colBut = $('<td></td>').append(butAct2);
    row.append(colName).append(colPrice).append(colBut);
    $('#in-app-purchase').append(row);
  }
}
function addLicenseDataToProduct(license) {
  $('#IAP_' + license.sku).text('View license').data('license', license);
}
function getLicenses() {
  google.payments.inapp.getPurchases({
    parameters: {env: 'prod'},
    success: onLicenseUpdate,
    failure: onLicenseUpdateFailed
  });
}
function onPurchase(purchase) {
  bkg.console.log('onPurchase', purchase);
  // purchase.request.cardId,
  // purchase.response.orderId;
  getLicenses();
}
function onPurchaseFailed(purchase) {
  bkg.console.log('onPurchaseFailed', purchase);
  window.alert('Purchase failed. Error code [' + purchase.response.errorType + '].');
}
function buyProduct(sku) {
  google.payments.inapp.buy({
    parameters: {env: 'prod'},
    sku: sku,
    success: onPurchase,
    failure: onPurchaseFailed
  });
}
function onSkuDetails(dt) {
  var products = dt.response.details.inAppProducts,
      count = products.length, i;
  if (count === 0) {
    bkg.console.log('onSkuDetails', dt);
    $('#in-app-purchase').addClass('Off');
  } else {
    for (i = 0; i < count; i += 1) {
      addProductToUI( products[i] );
    }
    getLicenses();
  }
}
function onSkuDetailsFailed(dt) {
  bkg.console.log('onSkuDetailsFailed', dt);
  $('#in-app-purchase').addClass('Off');
}
// IAP end

$(document).ready(function () {
  $('a[rel="external"]').attr('target', '_blank');
  $('button').button();

  $('#saveBtn').on('click', function() { saveOptions(); });
  $('#save_it_tab').on('click', function() { $('#option_tabs').tabs('select', 1); });
  $('#alert_tab').on('click', function() { $('#option_tabs').tabs('select', 3); });
  $('#ezproxy_input').focus(function () {
    if (this.value === this.defaultValue) {
      this.value = '';
    }
  }).blur(function () {
    if (!this.value.length) {
      this.value = this.defaultValue;
    }
  });

  if ( $.cookie('alert_v1') ) {
    $('#alert_v1').removeClass('Off');
    $.cookie('alert_v1', null);
  }
  if ( $.cookie('alert_v2') ) {
    $('#alert_v2').removeClass('Off');
    $.cookie('alert_v2', null);
  }
  $('input.settings').on('change', function () {
    $('#save_widget').removeClass('Off');
  });

  var a_key = localStorage.getItem('thepaperlink_apikey'),
      b_key = localStorage.getItem('pubmeder_apikey'),
      b_email = localStorage.getItem('pubmeder_email'),
      m_status = localStorage.getItem('mendeley_status'),
      f_status = localStorage.getItem('facebook_status'),
      d_status = localStorage.getItem('dropbox_status'),
      b_status = localStorage.getItem('douban_status'),
      g_status = localStorage.getItem('googledrive_status'),
      s_status = localStorage.getItem('skydrive_status'),
      y_status = localStorage.getItem('baiduyun_status'),
      ezproxy_prefix = localStorage.getItem('ezproxy_prefix'),
      cc_address = localStorage.getItem('cc_address');

  if (a_key) {
    $('#thepaperlink_apikey').html('<span class="keys">' + a_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_one">[x]</span>');
    $('#reset_key_one').on('click', function() { reset_key(1); });
    $('.thepaperlink_a').css('display', 'none');
    $('#ws_items_status').text('login');
    $.cookie('alert_v1', null);
    $('#cloud_op_info').addClass('Off');
  } else {
    $('#thepaperlink_apikey').html('<input class="settings" type="text" value="" size="40" id="thepaperlink_apikey_input" />');
    $('#thepaperlink_apikey_input').on('change', function () {
      $('#save_widget').removeClass('Off');
    });
    $('#ws_items_status').text('logout');
  }
  if (b_key) {
    $('#pubmeder_email').html('<span class="keys">' + b_email + '</span>');
    $('#pubmeder_apikey').html('<span class="keys">' + b_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_two">[x]</span>');
    $('#reset_key_two').on('click', function() { reset_key(2); });
    $('#pubmeder_a').text('OK');
    $.cookie('alert_v2', null);
  } else {
    $('#pubmeder_email').html('<input class="settings" type="text" value="" size="40" id="pubmeder_email_input" />');
    $('#pubmeder_apikey').html('<input class="settings" type="text" value="" size="40" id="pubmeder_apikey_input" />');
    $('#pubmeder_apikey_input').on('change', function () {
      $('#save_widget').removeClass('Off');
    });
  }
  if (m_status) {
    $('#mendeley_status').removeClass('Off');
    $('#mendeley_status').text('status: ' + m_status);
    $('#mendeley_a').text('check connection');
  }
  if (f_status) {
    $('#facebook_status').removeClass('Off');
    $('#facebook_status').text('status: ' + f_status);
    $('#facebook_a').text('check connection');
  }
  if (d_status) {
    $('#dropbox_status').removeClass('Off');
    $('#dropbox_status').text('status: ' + d_status);
    $('#dropbox_a').text('check connection');
  }
  if (b_status) {
    $('#douban_status').removeClass('Off');
    $('#douban_status').text('status: ' + b_status);
    $('#douban_a').text('check connection');
  }
  if (g_status) {
    $('#googledrive_status').removeClass('Off');
    $('#googledrive_status').text('status: ' + g_status);
    $('#googledrive_a').text('check connection');
  }
  if (s_status) {
    $('#skydrive_status').removeClass('Off');
    $('#skydrive_status').text('status: ' + s_status);
    $('#skydrive_a').text('check connection');
  }
  if (y_status) {
    $('#baiduyun_status').removeClass('Off');
    $('#baiduyun_status').text('status: ' + y_status);
    $('#baiduyun_a').text('check connection');
  }
  if (ezproxy_prefix) {
    $('#ezproxy_input').val(ezproxy_prefix);
    $('#ez_info').removeClass('Off');
    $('.ezproxy_prefix').text(ezproxy_prefix);
    if (ezproxy_prefix.substr(0,1) === '.') {
      $('#ezproxy_demo').addClass('Off');
    } else {
      $('#ezproxy_demo_dot').addClass('Off');
    }
  }
  if (cc_address) {
    $('#cc_address').val(cc_address);
  }
  if (localStorage.getItem('alert_outdated')) {
    $('.alert_outdated').removeClass('Off');
    localStorage.removeItem('alert_outdated');
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" checked /> You are using <b>our reverse proxy</b> to access "the paper link".' +
        ' It is slower.');
    $('#api_server').text('https://www.zhaowenxian.com');
    $('.reg_thepaperlink').text('https://www.zhaowenxian.com/reg');
    $('.reg_thepaperlink').attr('href', 'https://www.zhaowenxian.com/reg');
    $('#alerts_thepaperlink').attr('href', 'https://www.zhaowenxian.com/alerts');
    $('.reg_pubmeder').text('https://1.zhaowenxian.com/registration');
    $('.reg_pubmeder').attr('href', 'https://1.zhaowenxian.com/registration');
    $('#scholar_once_info').addClass('Off');
  } else if (localStorage.getItem('https_failed')) {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" /> If you are getting <span style="color:red">too many errors</span>,' +
        ' <b>check to enable</b> the reverse proxy to our service.');
    $('#api_server').text('http://www.thepaperlink.com');
  } else {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" /> You don\'t need to use the reverse proxy, which is slower.' +
        ' If you really want to, feel free to check to enable it.');
    $('#api_server').text('https://pubget-hrd.appspot.com');
  }
  $('#rev_proxy').on('change', function () {
    $('#save_widget').removeClass('Off');
  });
  if (localStorage.getItem('co_pubmed') === 'no') {
    $('#co_pubmed').prop('checked', true);
    $('#pubmeder_info').removeClass('Off');
  } else {
    $('#pubmeder_span').html(' (your search in popup widget has a max limit of <input class="settings" type="text" value="10" size="2" id="pubmed_limit" />)');
    if (localStorage.getItem('pubmed_limit')) {
      $('#pubmed_limit').val( localStorage.getItem('pubmed_limit') );
    }
    $('#pubmed_limit').on('change', function () {
      $('#save_widget').removeClass('Off');
    });
  }
  if (localStorage.getItem('new_tab') !== 'no') {
    $('#new_tab').prop('checked', true);
  }
  if (localStorage.getItem('contextMenu_shown') === 'no') {
    $('#contextMenu_shown').prop('checked', true);
  }
  if (localStorage.getItem('ws_items') === 'yes') {
    $('#ws_items').prop('checked', true);
    if (localStorage.getItem('scholar_once') !== 'no') {
      $('#scholar_once').prop('checked', true);
    }
    if (localStorage.getItem('websocket_server')) {
      $('#websocket_server').text( localStorage.getItem('websocket_server') );
    }
    $('#ws_info').removeClass('Off');
  }
  if (localStorage.getItem('ajax_pii_link') !== 'no') {
    $('#ajax_pii_link').prop('checked', true);
    $('#ajax_info').removeClass('Off');
  }
  if (localStorage.getItem('scihub_link') !== 'no') {
    $('#scihub_span').html(' (with a max limit of <input class="settings" type="text" value="3" size="1" id="scihub_limit" /> per page)');
    if (localStorage.getItem('scihub_limit')) {
      $('#scihub_limit').val( localStorage.getItem('scihub_limit') );
    }
    $('#scihub_limit').on('change', function () {
      $('#save_widget').removeClass('Off');
    });
    $('#scihub_link').prop('checked', true);
    $('#scihub_info').removeClass('Off');
    if (localStorage.getItem('scihub_download') === 'yes') {
      $('#scihub_download').prop('checked', true);
      $('#scihub_download_info').removeClass('Off');
    } else {
      $('#scihub_download_info').addClass('Off');
    }
    if (localStorage.getItem('scihub_open_files') === 'yes') {
      $('#scihub_open_files').prop('checked', true);
    }
  }

  if (localStorage.getItem('past_search_terms')) {
    var terms = localStorage.getItem('past_search_terms').split('||'),
        tmp = $('#keywords_list'),
        t = 0, i, a, b, c = [];
    terms.pop();
    for (i = terms.length - 1; i > -1; i -= 1) { // list most recent on top
      b = localStorage.getItem(terms[i]);
      if (b) {
        a = terms[i].toLowerCase().
            replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' ');
        if (a !== terms[i]) {
          localStorage.setItem(a, b);
          localStorage.removeItem(terms[i]);
        }
        if (c[a] && get_end_num(c[a]) >= get_end_num(b)) {
          localStorage.removeItem(terms[i]);
        } else if (c[a]) { // get_end_num  c[a] < b
          bkg.console.log('count should only increase "' + a + '"');
        } else {
          c.push( {key:a, value:b} );
          tmp.append(
              '<li class="keywords_li"><input class="keywords" type="checkbox" id="' +
              a.replace(/"/g, ',,') + '" /> <span style="width:200px">' + a +
              '</span> <a href="#">' + get_end_num(b) + '</a></li>'
          );
          t += 1;
        }
      } }
    if (t > 0) {
      var span_max = 200;
      $('.keywords_li span').each(function () {
        if ($(this).width() > span_max) {
          span_max = $(this).width();
        }
      });
      if (span_max > 300) {
        span_max = 300;
      }
      $('.keywords_li span').each(function () {
        $(this).width(span_max + 40);
      });
      $('#keywords_area').width(span_max + 57);
      $('#graph_trend').width( $('#keywords_list').width() - span_max - 165 );
      //$('#graph_trend').height( $('#keywords_list').height() + 25 );
      if (t > 5) {
        tmp.append('<li><span id="select_all_keywords" style="cursor:pointer;color:#ccc">click to select all keywords</span>' +
            '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id="toggle_all_keywords" style="cursor:pointer;color:#ccc">click to toggle current selection</span></li>');
        $('#toggle_all_keywords').on('click', function() {
          $('.keywords').each(function () {
            toggle_checked( $(this), 1 );
          });
          adjust_keywords();
        });
        $('#select_all_keywords').on('click', function() {
          $('.keywords').prop('checked', true);
          adjust_keywords();
        });
      }
      $('input.keywords').on('change', function () {
        adjust_keywords();
      });
      $('.keywords_li span').on('click', function() {
        toggle_checked( $(this).parent().children('input') );
      });
      $('.keywords_li a').addClass('ui-button ui-state-default ui-corner-all');
      $('.keywords_li a').on('click', function(e) {
        e.preventDefault();
        var term = $(this).parent().children('span').text(),
            hist = localStorage.getItem(term),
            hist_array = hist.split('||'),
            tt = $('#graph_trend').offset().top - 25,
            j = 'search results count: ' + term + '\n----\n', k, l,
            len = hist_array.length;
        for (k = 0; k < len; k += 1) {
          l = hist_array[k].lastIndexOf(',');
          tmp = hist_array[k].substr(0, l).replace(/,/g, '/') + '\t' + hist_array[k].substr(l+1) + '\n';
          j += tmp;
        }
        $('#graph_trend').html('<pre style="font-size:12px;margin-left:0.5em;margin-top:0">' + j +
            '</pre><span style="margin-left:0.5em" id="delete_term_log">delete</span>' +
            '<span id="search_term_again">search now</span>');
        if (window.pageYOffset > tt) {
          $('#graph_trend').css('padding-top', window.pageYOffset - tt);
        } else {
          $('#graph_trend').css('padding-top', 0);
        }
        $('#delete_term_log').on('click', function () {
          var answer = window.confirm('\n do you really want to delete this keyword?\n ' + term + '\n');
          if (answer) {
            localStorage.removeItem(term);
            location.reload();
          }
        });
        $('#search_term_again').on('click', function () {
          chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.create({
              index: tabs[0].index,
              url: 'http://www.ncbi.nlm.nih.gov/pubmed?term=' + term,
              active: true
            });
          });
        });
        return false;
      });
      $('#submit_keyword').on('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          if (localStorage.getItem('rev_proxy') === 'yes') {
            chrome.tabs.create({
              index: tabs[0].index,
              url: 'https://www.zhaowenxian.com/prospective?' + $('#keywords_area').serialize(),
              active: true
            });
          } else {
            chrome.tabs.create({
              index: tabs[0].index,
              url: 'http://www.thepaperlink.com/prospective?' + $('#keywords_area').serialize(),
              active: true
            });
          }
        });
      });
    }
  }

  google.payments.inapp.getSkuDetails({
    parameters: {env: 'prod'},
    success: onSkuDetails,
    failure: onSkuDetailsFailed
  });
  $('#option_tabs').tabs({cookie: {expires: 9}});
});