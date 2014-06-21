"use strict";

var _port = chrome.runtime.connect({name: 'background_port'});

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
    $('#keywords_area').text('feature in development');
    $('#keywords_area').addClass('Off');
    $('#submit_keyword').addClass('Off');
  }
}

function toggle_checked(obj) {
  if (obj.prop('checked')) {
    obj.prop('checked', false);
  } else {
    obj.prop('checked', true);
  }
  adjust_keywords();
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
  var answer = confirm('\n do you really want to rest the key?\n');
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
  return $.get('http://0.cail.cn/api?validate=' + ak,
    function (txt) {
      if (txt === 'valid') {
        localStorage.setItem('thepaperlink_apikey', ak);
        localStorage.setItem('a_apikey_gold', 1);
      } else {
        $.cookie('alert_v1', 'oops', {expires: 3});
      }
    },
    'json'
  );
}

function valid_pubmeder(e,ak) {
  return $.get('http://1.zhaowenxian.com/input?pmid=999999999&apikey=' + ak + '&email=' + e,
    function (txt) {
      if (txt === 'correct') {
        localStorage.setItem('pubmeder_apikey', ak);
        localStorage.setItem('pubmeder_email', e);
        localStorage.setItem('b_apikey_gold', 1);
      } else {
        $.cookie('alert_v2', 'oops', {expires: 3});
      }
    },
    'text'
  );
}

function saveOptions() {
  var rev_proxy = $('#rev_proxy').prop('checked'),
    co_pubmed = $('#co_pubmed').prop('checked'),
    new_tab = $('#new_tab').prop('checked'),
    contextMenu_shown = $('#contextMenu_shown').prop('checked'),
    ws_items = $('#ws_items').prop('checked'),
    ajax_pii_link = $('#ajax_pii_link').prop('checked'),
    pubmed_limit = $('#pubmed_limit').val(),
    ezproxy_prefix = $('#ezproxy_input').val(),
    req_a = null,
    req_b = null;
  if (rev_proxy) {
    localStorage.setItem('rev_proxy', 'yes');
  } else {
    localStorage.setItem('rev_proxy', 'no');
  }
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
  if (ajax_pii_link) {
    localStorage.setItem('ajax_pii_link', 'yes');
  } else {
    localStorage.setItem('ajax_pii_link', 'no');
  }
  if (pubmed_limit) {
    try {
      var a = parseInt(pubmed_limit, 10);
      if (a && a !== 10) {
        localStorage.setItem('pubmed_limit', a);
      }
    } catch (err) {
      console.log(err);
    }
  }
  if (ezproxy_prefix && (ezproxy_prefix.substr(0,7) === 'http://' || ezproxy_prefix.substr(0,8) === 'https://')) {
    localStorage.setItem('ezproxy_prefix', ezproxy_prefix);
  } else {
    if (ezproxy_prefix === '{prefix}') {
      ezproxy_prefix = '';
    }
    if (ezproxy_prefix) {
      alert('\n wrong format of the {prefix}\n please check with your librarian\n');
      $('#ezproxy_input').focus();
      return false;
    }
    localStorage.setItem('ezproxy_prefix', '');
  }
  if ( !localStorage.getItem('a_apikey_gold') ) {
    var accessApi = $('#thepaperlink_apikey_input').val();
    if (accessApi.length === 32) {
      req_a = valid_thepaperlink(accessApi);
    } else if (accessApi) {
      if (localStorage.getItem('rev_proxy') === 'yes') {
        alert('\n please provide a valid apikey to use the extension\n get it from http://www.zhaowenxian.com/reg\n');
      } else {
        alert('\n please provide a valid apikey to use the extension\n get it from http://www.thepaperlink.com/reg\n');
      }
      $('#thepaperlink_apikey_input').focus();
      return false;
    }
  }
  if ( !localStorage.getItem('b_apikey_gold') ) {
    var userEmail = $('#pubmeder_email_input').val(),
      email_filter = /^[^@]+@[^@]+.[a-z]{2,}$/i,
      userApi = $('#pubmeder_apikey_input').val();
    if (userEmail && !email_filter.test(userEmail)) {
      alert('\n please provide a valid email address\n');
      $('#pubmeder_email_input').focus();
      return false;
    } else if (userEmail && (!userApi || userApi.length !== 32)) {
      if (localStorage.getItem('rev_proxy') === 'yes') {
        alert('\n please provide a valid apikey\n get it from http://1.zhaowenxian.com/registration\n');
      } else {
        alert('\n please provide a valid apikey\n get it from http://www.pubmeder.com/registration\n');
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

$(document).ready(function () {
  $('a[rel="external"]').attr('target', '_blank');
  $('button').button();

  if ( $.cookie('alert_v1') ) {
    $('#alert_v1').removeClass('Off');
    $.cookie('alert_v1', null);
  }
  if ( $.cookie('alert_v2') ) {
    $('#alert_v2').removeClass('Off');
    $.cookie('alert_v2', null);
  }

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

  var a_key = localStorage.getItem('thepaperlink_apikey'),
    b_key = localStorage.getItem('pubmeder_apikey'),
    b_email = localStorage.getItem('pubmeder_email'),
    m_status = localStorage.getItem('mendeley_status'),
    f_status = localStorage.getItem('facebook_status'),
    d_status = localStorage.getItem('dropbox_status'),
    b_status = localStorage.getItem('douban_status'),
    g_status = localStorage.getItem('googledrive_status'),
    s_status = localStorage.getItem('skydrive_status'),
    ezproxy_prefix = localStorage.getItem('ezproxy_prefix');

  if (a_key) {
    $('#thepaperlink_apikey').html('<span class="keys">' + a_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_one">[x]</span>');
    $('#reset_key_one').on('click', function() { reset_key(1); });
    $('.thepaperlink_a').css('display', 'none');
    $('#ws_items_status').text('login');
    $.cookie('alert_v1', null);
    $('#cloud_op_info').addClass('Off');
  } else {
    $('#thepaperlink_apikey').html('<input class="settings" type="text" value="" size="40" id="thepaperlink_apikey_input" />');
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
  if (ezproxy_prefix) {
    $('#ezproxy_input').val(ezproxy_prefix);
    $('#ezproxy_prefix').text(ezproxy_prefix);
    $('#ez_info').removeClass('Off');
  }
  if (localStorage.getItem('alert_outdated')) {
    $('.alert_outdated').removeClass('Off');
    localStorage.removeItem('alert_outdated');
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" checked /> You are using <b>our reverse proxy</b> to access "the paper link".' +
      ' It is slower.');
    $('#api_server').text('http://www.zhaowenxian.com');
    $('.reg_thepaperlink').text('http://www.zhaowenxian.com/reg');
    $('.reg_thepaperlink').attr('href', 'http://www.zhaowenxian.com/reg');
    $('.reg_pubmeder').text('http://1.zhaowenxian.com/registration');
    $('.reg_pubmeder').attr('href', 'http://1.zhaowenxian.com/registration');
  } else if (localStorage.getItem('https_failed')) {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" /> If you are getting <span style="color:red">too many errors</span>,' +
      ' <b>check to enable</b> the reverse proxy to our service.');
    $('#api_server').text('http://www.thepaperlink.com');
  } else {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" /> You don\'t need to use the reverse proxy, which is slower.' +
      ' If you really want to, feel free to check to enable it.');
    $('#api_server').text('https://pubget-hrd.appspot.com');
  }
  if (localStorage.getItem('co_pubmed') === 'no') {
    $('#co_pubmed').prop('checked', true);
    $('#pubmeder_info').removeClass('Off');
  } else {
    $('#pubmeder_span').html(' (your search in popup widget has a max limit of <input class="settings" type="text" value="10" size="1" id="pubmed_limit" />)');
    if (localStorage.getItem('pubmed_limit')) {
      $('#pubmed_limit').val( localStorage.getItem('pubmed_limit') );
    }
  }
  if (localStorage.getItem('new_tab') !== 'no') {
    $('#new_tab').prop('checked', true);
  }
  if (localStorage.getItem('contextMenu_shown') === 'no') {
    $('#contextMenu_shown').prop('checked', true);
  }
  if (localStorage.getItem('ws_items') === 'yes') {
    $('#ws_items').prop('checked', true);
    if (localStorage.getItem('websocket_server')) {
      $('#websocket_server').text( localStorage.getItem('websocket_server') );
    }
    $('#ws_info').removeClass('Off');
  }
  if (localStorage.getItem('ajax_pii_link') !== 'no') {
    $('#ajax_pii_link').prop('checked', true);
    $('#ajax_info').removeClass('Off');
  }

  if (localStorage.getItem('past_search_terms')) {
    var terms = localStorage.getItem('past_search_terms').split('||'),
      t = '', tmp, i, a, b, c = [];
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
          console.log('count should only increase "' + a + '"');
        } else {
          c.push( {key:a, value:b} );
          tmp = '<li class="keywords_li"><input class="keywords" type="checkbox" id="' +
            a.replace(/"/g, ',,') + '" /> <span>' + a +
            '</span> <a href="#">' + get_end_num(b) + '</a></li>';
          t += tmp;
        }
    } }
    if (t) {
      var span_max = 0;
      $('#keywords_list').append(t);
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
      $('#graph_trend').width( $('#keywords_list').width() - span_max - 165 );
      //$('#graph_trend').height( $('#keywords_list').height() + 25 );
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
          j = 'search results count: ' + term + '\n----\n', k, len, l;
        for (k = 0, len = hist_array.length; k < len; k += 1) {
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
          var answer = confirm('\n do you really want to delete this keyword?\n ' + term + '\n');
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
              url: 'http://www.zhaowenxian.com/prospective?' + $('#keywords_area').serialize(),
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

  $('#option_tabs').tabs({cookie: {expires: 9}});
  $('input.settings').on('change', function () {
    $('#save_widget').removeClass('Off');
  });
});