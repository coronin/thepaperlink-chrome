'use strict';

const _port = chrome.runtime.connect({ name: 'background_port' });
const _bkg = chrome.extension.getBackgroundPage();
const email_filter = /^[^@]+@[^@]+.[a-z]{2,}$/i;

function adjust_keywords () {
  let keyword_selected = '';
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

function toggle_checked (obj, q) {
  if (obj.prop('checked')) {
    obj.prop('checked', false);
  } else {
    obj.prop('checked', true);
  }
  if (!q) {
    adjust_keywords();
  }
}

function get_end_num (str) {
  if (!str) { return 0; }
  try {
    return parseInt(str.substr(str.lastIndexOf(',') + 1), 10);
  } catch (err) {
    return 0;
  }
}

function reset_key (v) {
  const answer = window.confirm('\n do you really want to rest the key?\n');
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
    _port && _port.postMessage({ load_common_values: 1 });
  }
}

function valid_thepaperlink (ak) {
  _bkg.console.time('Call theServer to validate apikey');
  return $.get('https://www.thepaperlink.com/api',
    {
      validate: ak,
      runtime: '' + chrome.runtime.id
    },
    function (txt) {
      if (txt === 'valid') {
        _port && _port.postMessage({ save_apikey: ak, save_email: null });
      } else {
        $.cookie('alert_v1', 'oops', { expires: 3 });
      }
    }, 'json'
  ).always(function () {
    _bkg.console.timeEnd('Call theServer to validate apikey');
  });
}

function valid_pubmeder (e, ak) {
  _bkg.console.time('Call theServer to validate pubmeder');
  return $.get('https://pubmeder-hrd.appspot.com/input?pmid=999999999&apikey=' + ak + '&email=' + e,
    function (txt) {
      if (txt === 'correct') {
        _port && _port.postMessage({ save_apikey: ak, save_email: e });
      } else {
        $.cookie('alert_v2', 'oops', { expires: 3 });
      }
    }, 'text'
  ).always(function () {
    _bkg.console.timeEnd('Call theServer to validate pubmeder');
  });
}

function saveOptions () {
  const rev_proxy = $('#rev_proxy').prop('checked');
  const new_tab = $('#new_tab').prop('checked');
  const contextMenu_shown = $('#contextMenu_shown').prop('checked');
  const ws_items = $('#ws_items').prop('checked');
  const scholar_once = $('#scholar_once').prop('checked');
  const shark_link = $('#shark_link').prop('checked');
  const shark_download = $('#shark_download').prop('checked');
  const shark_open_files = $('#shark_open_files').prop('checked');
  const shark_limit = $('#shark_limit').val();
  const pubmed_limit = $('#pubmed_limit').val();
  const arbitrary_sec = $('#arbitrary_sec').val();
  let ezproxy_prefix = $('#ezproxy_input').val();
  let cc_address = $('#cc_address').val();
  const local_mirror = $('#local_mirror').val();
  let req_a = null;
  let req_b = null;
  let a; // ajax_pii_link = $('#ajax_pii_link').prop('checked'), co_pubmed = $('#co_pubmed').prop('checked'),
  // if (co_pubmed) {
  //  localStorage.setItem('co_pubmed', 'no');
  // } else {
  //  localStorage.setItem('co_pubmed', 'yes');
  // }
  localStorage.removeItem('co_pubmed'); // 2020-8-5
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
      _port && _port.postMessage({ menu_display: 1 });
    }
  }
  if (ws_items) {
    localStorage.setItem('ws_items', 'yes');
    _port && _port.postMessage({ load_broadcast: 1 });
  } else {
    localStorage.setItem('ws_items', 'no');
  }
  if (scholar_once) { // && ws_items
    localStorage.setItem('scholar_once', 'yes');
  } else {
    localStorage.setItem('scholar_once', 'no');
  }
  if (rev_proxy) {
    localStorage.setItem('rev_proxy', 'yes');
    localStorage.setItem('websocket_server', 'node.thepaperlink.cn:8081');
    localStorage.setItem('scholar_once', 'yes'); // ws_items + route to google
  } else {
    localStorage.setItem('rev_proxy', 'no');
    localStorage.removeItem('websocket_server');
  }
  // if (ajax_pii_link) {
  //  localStorage.setItem('ajax_pii_link', 'yes');
  // } else {
  localStorage.setItem('ajax_pii_link', 'no'); // 2020-8-5
  // }
  if (shark_link) {
    localStorage.setItem('shark_link', 'yes');
    localStorage.setItem('shark_open_files', 'no');
    if (shark_download) {
      localStorage.setItem('shark_download', 'yes');
      if (shark_open_files) {
        localStorage.setItem('shark_open_files', 'yes');
      }
    } else {
      localStorage.setItem('shark_download', 'no');
    }
  } else {
    localStorage.setItem('shark_link', 'no');
    localStorage.setItem('shark_download', 'no');
    localStorage.setItem('shark_open_files', 'no');
  }
  if (shark_limit) {
    try {
      a = parseInt(shark_limit, 10);
      if (a && a !== 3) {
        localStorage.setItem('shark_limit', a);
      }
    } catch (err) {
      _bkg.console.log(err);
    }
  }
  if (pubmed_limit) {
    try {
      a = parseInt(pubmed_limit, 10);
      if (a && a <= 25) {
        localStorage.setItem('pubmed_limit', a);
      } else {
        localStorage.setItem('pubmed_limit', 10); // 2020-4-2
      }
    } catch (err) {
      _bkg.console.log(err);
    }
  }
  if (arbitrary_sec) {
    try {
      a = parseInt(arbitrary_sec, 10);
      if (a && a <= 10) {
        localStorage.setItem('arbitrary_sec', a);
      } else {
        localStorage.setItem('arbitrary_sec', 5); // 2020-4-23
      }
    } catch (err) {
      _bkg.console.log(err);
    }
  }
  if (ezproxy_prefix && (ezproxy_prefix.substr(0, 7) === 'http://' || ezproxy_prefix.substr(0, 8) === 'https://')) {
    localStorage.setItem('ezproxy_prefix', ezproxy_prefix);
  } else if (ezproxy_prefix && ezproxy_prefix.substr(0, 1) === '.' && ezproxy_prefix.substr(1, 1) !== '.') {
    const ezproxy_endswith = ezproxy_prefix.substr(-3, 3).toLowerCase();
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
  if (local_mirror && local_mirror !== '{local.mirror}') {
    localStorage.setItem('local_mirror', local_mirror);
  } else {
    localStorage.removeItem('local_mirror');
  }
  if (!localStorage.getItem('a_apikey_gold')) {
    const accessApi = $('#thepaperlink_apikey_input').val().replace(/\s+/g, '');
    if (accessApi.length === 32) {
      req_a = valid_thepaperlink(accessApi);
    } else if (accessApi) {
      window.alert('\n please provide a valid apikey to use the extension\n get it from https://www.thepaperlink.com/reg\n');
      $('#thepaperlink_apikey_input').focus();
      return false;
    }
  }
  if (!localStorage.getItem('b_apikey_gold')) {
    const userEmail = $('#pubmeder_email_input').val();
    const userApi = $('#pubmeder_apikey_input').val().replace(/\s+/g, '');
    if (userEmail && !email_filter.test(userEmail)) {
      window.alert('\n please provide a valid email address\n');
      $('#pubmeder_email_input').focus();
      return false;
    } else if (userEmail && (!userApi || userApi.length !== 32)) {
      window.alert('\n please provide a valid apikey\n get it from https://pubmeder-hrd.appspot.com/registration\n');
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
  _port && _port.postMessage({ load_common_values: 1 });
}

// https://github.com/petele/IAPDemo/blob/master/scripts/app.js
// 2018-9-27 @@@@
// IAP end

$(document).ready(function () {
  $('a[rel="external"]').attr('target', '_blank');
  $('button').button();
  $('#history_html').text('logs');
  $('#history_html').attr('href', chrome.runtime.getURL('history.html'));

  $('#saveBtn').on('click', function () { saveOptions(); });
  $('#save_it_tab').on('click', function () { $('#option_tabs').tabs('select', 1); });
  $('#alert_tab').on('click', function () { $('#option_tabs').tabs('select', 3); });
  $('#ezproxy_input').focus(function () {
    if (this.value === this.defaultValue) {
      this.value = '';
    }
  }).blur(function () {
    if (!this.value.length) {
      this.value = this.defaultValue;
    }
  });
  $('#cc_address').focus(function () {
    if (this.value === this.defaultValue) {
      this.value = '';
    }
  }).blur(function () {
    if (!this.value.length) {
      this.value = this.defaultValue;
    }
  });
  $('#local_mirror').focus(function () {
    if (this.value === this.defaultValue) {
      this.value = '';
    }
  }).blur(function () {
    if (!this.value.length) {
      this.value = this.defaultValue;
    }
  });

  if ($.cookie('alert_v1')) {
    $('#alert_v1').removeClass('Off');
    $.cookie('alert_v1', null);
  }
  if ($.cookie('alert_v2')) {
    $('#alert_v2').removeClass('Off');
    $.cookie('alert_v2', null);
  }
  $('input.settings').on('change', function () {
    $('#save_widget').removeClass('Off');
  });

  const a_key = localStorage.getItem('thepaperlink_apikey');
  const b_key = localStorage.getItem('pubmeder_apikey');
  const b_email = localStorage.getItem('pubmeder_email');
  const c_key = localStorage.getItem('ncbi_api');
  const m_status = localStorage.getItem('mendeley_status');
  const f_status = localStorage.getItem('facebook_status');
  const d_status = localStorage.getItem('dropbox_status');
  const b_status = localStorage.getItem('douban_status');
  const g_status = localStorage.getItem('googledrive_status');
  const o_status = localStorage.getItem('onedrive_status');
  const y_status = localStorage.getItem('baiduyun_status');
  const ezproxy_prefix = localStorage.getItem('ezproxy_prefix');
  const cc_address = localStorage.getItem('cc_address');
  const local_mirror = localStorage.getItem('local_mirror');

  if (a_key) {
    $('#thepaperlink_apikey').html('<span class="keys">' + a_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_one">[x]</span>');
    $('#reset_key_one').on('click', function () { reset_key(1); });
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
  if (c_key) {
    $('#ncbi_api').html('<span class="keys">' + c_key + '</span>');
    $('#ncbi_link').attr('href', 'https://www.ncbi.nlm.nih.gov/account/');
    $('#ncbi_link').text('with NCBI is required :');
  } else {
    $('#ncbi_api').html('');
    $('#ncbi_link').attr('href', 'https://www.ncbi.nlm.nih.gov/account/settings/');
  }
  if (b_key) {
    $('#pubmeder_email').html('<span class="keys">' + b_email + '</span>');
    $('#pubmeder_apikey').html('<span class="keys">' + b_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_two">[x]</span>');
    $('#reset_key_two').on('click', function () { reset_key(2); });
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
    if (d_status === 'success') {
      $('#shark_dropbox').html('and <em>Dropbox</em> it');
    }
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
  if (o_status) {
    $('#onedrive_status').removeClass('Off');
    $('#onedrive_status').text('status: ' + o_status);
    $('#onedrive_a').text('check connection');
  }
  if (y_status) {
    $('#baiduyun_status').removeClass('Off');
    $('#baiduyun_status').text('status: ' + y_status);
    $('#baiduyun_a').text('check connection');
  }
  if (ezproxy_prefix) {
    $('#ezproxy_input').val(ezproxy_prefix);
    $('#ezproxy_enabled').text('is your ezproxy prefix.');
    $('#ez_info').removeClass('Off');
    $('.ezproxy_prefix').text(ezproxy_prefix);
    if (ezproxy_prefix.substr(0, 1) === '.') {
      $('#ezproxy_demo').addClass('Off');
    } else {
      $('#ezproxy_demo_dot').addClass('Off');
    }
  }
  if (local_mirror) {
    $('#local_mirror').val(local_mirror);
    $('#local_enabled').text('is your local server domain name.');
    $('.local_prefix').text(local_mirror);
    $('#local_info').removeClass('Off');
  }
  if (cc_address) {
    $('#cc_address').val(cc_address);
    $('#cc_enabled').text('will get the abstract when you "email it" (expanded button from ... on the bar).');
  }
  if (localStorage.getItem('alert_outdated')) {
    $('.alert_outdated').removeClass('Off');
    localStorage.removeItem('alert_outdated');
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" checked /> You are using <b>our Not-Google servers</b> to access "the paper link".');
    $('#api_server').text('https://www.thepaperlink.cn');
    $('#alerts_thepaperlink').attr('href', 'https://www.thepaperlink.cn/alerts');
    // $('.reg_pubmeder').text('http://pubmeder.cailiang.net/registration');
    // $('.reg_pubmeder').attr('href', 'http://pubmeder.cailiang.net/registration');
    $('#scholar_once_info').addClass('Off');
    $('#shark_dropbox').addClass('Off');
  } else {
    $('#rev_proxy_content').html('<input class="settings" type="checkbox" id="rev_proxy" /> You don\'t need to use this.' +
        ' If you want to, check to <strong>access</strong> our Not-Google servers.');
    $('#api_server').text('https://www.thepaperlink.com');
  }
  $('#rev_proxy').on('change', function () {
    $('#save_widget').removeClass('Off');
  });
  // if (localStorage.getItem('co_pubmed') === 'no') {
  //  $('#co_pubmed').prop('checked', true);
  //  $('#pubmeder_info').removeClass('Off');
  // } else {
  $('#pubmeder_span').html('In the popup widget will <strong>only show</strong> <input class="settings" type="text" value="5" size="2" id="pubmed_limit" /> items, even if there is more');
  if (localStorage.getItem('pubmed_limit')) {
    $('#pubmed_limit').val(localStorage.getItem('pubmed_limit'));
  }
  $('#pubmed_limit').on('change', function () {
    $('#save_widget').removeClass('Off');
  });
  // }
  if (localStorage.getItem('arbitrary_sec')) {
    $('#arbitrary_sec').val(localStorage.getItem('arbitrary_sec'));
  } else {
    $('#arbitrary_sec').val(5);
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
      $('#websocket_server').text(localStorage.getItem('websocket_server'));
    }
    $('#ws_info').removeClass('Off');
  }
  if (localStorage.getItem('scholar_once') !== 'no') {
    $('#scholar_once').prop('checked', true);
  }
  // if (localStorage.getItem('ajax_pii_link') !== 'no') {
  //  $('#ajax_pii_link').prop('checked', true);
  //  $('#ajax_info').removeClass('Off');
  // }
  if (localStorage.getItem('shark_link') === 'yes') {
    $('#shark_span').html(' Fetch limit to <input class="settings" type="text" value="3" size="1" id="shark_limit" /> files per page.');
    if (localStorage.getItem('shark_limit')) {
      $('#shark_limit').val(localStorage.getItem('shark_limit'));
    }
    $('#shark_limit').on('change', function () {
      $('#save_widget').removeClass('Off');
    });
    $('#shark_link').prop('checked', true);
    $('#shark_info').removeClass('Off');
    if (localStorage.getItem('shark_download') === 'yes') {
      $('#shark_download').prop('checked', true);
      $('#shark_download_info').removeClass('Off');
    } else {
      $('#shark_download_info').addClass('Off');
    }
    if (localStorage.getItem('shark_open_files') === 'yes') {
      $('#shark_open_files').prop('checked', true);
    }
  }

  if (localStorage.getItem('past_search_terms')) {
    let terms = localStorage.getItem('past_search_terms').split('||');
    let tmp = $('#keywords_list');
    let t = 0; let i; let a; let b; let c = [];
    terms.pop();
    for (i = terms.length - 1; i > -1; i -= 1) { // list most recent on top
      b = localStorage.getItem(terms[i]);
      if (b) {
        a = terms[i].toLowerCase().replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' ');
        if (a !== terms[i]) { // prettify history
          localStorage.setItem(a, b);
          localStorage.removeItem(terms[i]);
        }
        if (c[a] && get_end_num(c[a]) >= get_end_num(b)) {
          localStorage.removeItem(terms[i]);
        } else if (c[a]) { // get_end_num  c[a] < b
          _bkg.console.log('count should only increase "' + a + '"');
        } else {
          c.push({ key: a, value: b });
          tmp.append(
            '<li class="keywords_li"><input class="keywords" type="checkbox" id="' +
              a.replace(/"/g, ',,') + '" /> <span style="width:200px">' + a +
              '</span> <a href="#">' + get_end_num(b) + '</a></li>'
          );
          t += 1;
        }
      }
    }
    if (t > 0) {
      let span_max = 200;
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
      $('#graph_trend').width($('#keywords_list').width() - span_max - 165);
      // $('#graph_trend').height( $('#keywords_list').height() + 25 );
      if (t > 5) {
        tmp.append('<li><span id="select_all_keywords" style="cursor:pointer;color:#ccc">click to select all keywords</span>' +
            '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id="toggle_all_keywords" style="cursor:pointer;color:#ccc">click to toggle current selection</span></li>');
        $('#toggle_all_keywords').on('click', function () {
          $('.keywords').each(function () {
            toggle_checked($(this), 1);
          });
          adjust_keywords();
        });
        $('#select_all_keywords').on('click', function () {
          $('.keywords').prop('checked', true);
          adjust_keywords();
        });
      }
      $('input.keywords').on('change', function () {
        adjust_keywords();
      });
      $('.keywords_li span').on('click', function () {
        toggle_checked($(this).parent().children('input'));
      });
      $('.keywords_li a').addClass('ui-button ui-state-default ui-corner-all');
      $('.keywords_li a').on('click', function (e) {
        e.preventDefault();
        const term = $(this).parent().children('span').text();
        const hist = localStorage.getItem(term);
        const hist_array = hist.split('||');
        const tt = $('#graph_trend').offset().top - 25;
        let j = 'search results count: ' + term + '\n----\n'; let k; let l;
        const len = hist_array.length;
        for (k = 0; k < len; k += 1) {
          l = hist_array[k].lastIndexOf(',');
          tmp = hist_array[k].substr(0, l).replace(/,/g, '/') + '\t' + hist_array[k].substr(l + 1) + '\n';
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
          const answer = window.confirm('\n do you really want to delete this keyword?\n ' + term + '\n');
          if (answer) {
            localStorage.removeItem(term);
            location.reload();
          }
        });
        $('#search_term_again').on('click', function () {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.create({
              index: tabs[0].index,
              url: 'https://www.ncbi.nlm.nih.gov/pubmed?term=' + term,
              active: true
            });
          });
        });
        return false;
      });
      $('#submit_keyword').on('click', function () {
        window.alert('Server DOWN.');
        // GET /prospective?' + $('#keywords_area').serialize()
      });
    }
  }

  // google.payments.inapp.getSkuDetails({
  //  parameters: {env: 'prod'},
  //  success: onSkuDetails,
  //  failure: onSkuDetailsFailed
  // });
  $('#option_tabs').tabs({ cookie: { expires: 9 } });
});
