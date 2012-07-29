$(document).ready(function () {
  $(function () {
    $('a[rel="external"]').attr('target', '_blank');
    $('#option_tabs').tabs({cookie: {expires: 1}});
    $('button').button();
  });

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
    ezproxy_prefix = localStorage.getItem('ezproxy_prefix');
  if (a_key) {
    $('#thepaperlink_apikey').html('<span class="keys">' + a_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_one">[x]</span>');
    $('.thepaperlink_a').css('display', 'none');
    $('#ws_items_status').text('login');
  } else {
    $('#thepaperlink_apikey').html('<input type="text" value="" size="40" id="thepaperlink_apikey" />');
    $('#ws_items_status').text('logout');
  }
  if (b_key) {
    $('#pubmeder_email').html('<span class="keys">' + b_email + '</span>');
    $('#pubmeder_apikey').html('<span class="keys">' + b_key + '</span> &nbsp;&nbsp;<span style="cursor:pointer;color:#ccc" id="reset_key_two">[x]</span>');
    $('#pubmeder_a').text('search those articles');
    $('#pubmeder_a').attr('href', 'http://www.pubmeder.com/search');
  } else {
    $('#pubmeder_email').html('<input type="text" value="" size="40" id="pubmeder_email" />');
    $('#pubmeder_apikey').html('<input type="text" value="" size="40" id="pubmeder_apikey" />');
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
  if (ezproxy_prefix) {
    $('#ezproxy_input').val(ezproxy_prefix);
    $('#ezproxy_prefix').text(ezproxy_prefix);
    $('#ez_info').removeClass('Off');
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    $('#rev_proxy_content').html('<input type="checkbox" id="rev_proxy" checked /> You are using <b>our reverse proxy</b> to access "the Paper Link".' +
      ' It is slower.');
    $('#api_server').text('http://0.pl4.me');
  } else if (localStorage.getItem('https_failed')) {
    $('#rev_proxy_content').html('<input type="checkbox" id="rev_proxy" /> If you are getting too many errors, you could' +
      ' <b>check to enable</b> the reverse proxy. It is more accessible.');
    $('#api_server').text('http://www.thepaperlink.com');
  } else {
    $('#rev_proxy_content').html('<input type="checkbox" id="rev_proxy" /> You don\'t need to use the reverse proxy, which is slower.' +
      ' If you really want to, you can <b>check to enable</b> the reverse proxy.');
    $('#api_server').text('https://pubget-hrd.appspot.com');
  }
  if (localStorage.getItem('co_pubmed') === 'no') {
    $('#co_pubmed').prop('checked', true);
    $('#pubmeder_info').removeClass('Off');
  }
  if (localStorage.getItem('new_tab') === 'yes') {
    $('#new_tab').prop('checked', true);
  }
  if (localStorage.getItem('contextMenu_shown') === 'no') {
    $('#contextMenu_shown').prop('checked', true);
  }
  if (localStorage.getItem('ws_items') === 'yes') {
    $('#ws_items').prop('checked', true);
    if (localStorage.getItem('ws_address')) {
      $('#ws_server').text( localStorage.getItem('ws_address') );
    }
    $('#ws_info').removeClass('Off');
  }
  if (localStorage.getItem('ajax_pii_link') !== 'no') {
    $('#ajax_pii_link').prop('checked', true);
    $('#ajax_info').removeClass('Off');
  }

  $('input').on('change', function () {
    $('#save_widget').removeClass('Off');
  });

  $('#saveBtn').on('click', function() { saveOptions(); });
  $('#save_it_tab').on('click', function() { $('#option_tabs').tabs('select', 1); });
  $('#alert_tab').on('click', function() { $('#option_tabs').tabs('select', 3); });

  $('#reset_key_one').on('click', function() { reset_key(1); });
  $('#reset_key_two').on('click', function() { reset_key(2); });

  if (localStorage.getItem('past_search_terms')) {
    var terms = localStorage.getItem('past_search_terms').split('||'), i;
    terms.pop();
    for (i = 0; i < terms.length; i += 1) {
      $('#select_keywords').append('<li class="ui-widget-content">' + terms[i] +
        '<span style="padding-left:2em;">[' + localStorage.getItem(terms[i]) + ']</span></li>');
    }
    $('#select_keywords').parent().append('<textarea id="keywords_area"></textarea>');
    $('#select_keywords').selectable({
      stop: function() {
        var a = $('#keywords_area').empty();
        $('.ui-selected', this).each(function() {
          a.append(this.textContent + '\n');
        });
      }
    });
  }
});

function reset_key(v) {
  var answer = confirm('\ndo you really want to rest the key?\n');
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
    chrome.extension.sendRequest({load_common_values: 1});
  }
}

function valid_thepaperlink(ak) {
  return $.get('http://0.pl4.me/api?validate=' + ak,
    function (txt) {
      if (txt === 'valid') {
        localStorage.setItem('thepaperlink_apikey', ak);
        localStorage.setItem('a_apikey_gold', 1);
      } else {
        $('#thepaperlink_apikey').val('');
        alert('\n please provide a valid apikey\n get it from http://www.thepaperlink.com/reg\n');
      }
    },
    'json'
  );
}

function valid_pubmeder(e,ak) {
  return $.get('http://1.pl4.me/input?pmid=999999999&apikey=' + ak + '&email=' + e,
    function (txt) {
      if (txt === 'correct') {
        localStorage.setItem('pubmeder_apikey', ak);
        localStorage.setItem('pubmeder_email', e);
        localStorage.setItem('b_apikey_gold', 1);
      } else {
        $('#pubmeder_apikey').val('');
        alert('\n please provide a valid apikey\n get it from http://www.pubmeder.com/registration\n');
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
      chrome.extension.sendRequest({menu_display: 1});
    }
  }
  if (ws_items) {
    localStorage.setItem('ws_items', 'yes');
    chrome.extension.sendRequest({load_broadcast: 1});
  } else {
    localStorage.setItem('ws_items', 'no');
  }
  if (ajax_pii_link) {
    localStorage.setItem('ajax_pii_link', 'yes');
  } else {
    localStorage.setItem('ajax_pii_link', 'no');
  }
  if (ezproxy_prefix && (ezproxy_prefix.substr(0,7) === 'http://' || ezproxy_prefix.substr(0,8) === 'https://')) {
    localStorage.setItem('ezproxy_prefix', ezproxy_prefix);
  } else {
    if (ezproxy_prefix === '{prefix}') {
      ezproxy_prefix = '';
    }
    if (ezproxy_prefix) {
      alert('\n wrong format of the {prefix}\n please check with your librarian\n');
    }
    localStorage.setItem('ezproxy_prefix', '');
  }
  if ( !localStorage.getItem('a_apikey_gold') ) {
    var accessApi = $('#thepaperlink_apikey').val();
    if (accessApi.length === 32) {
      req_a = valid_thepaperlink(accessApi);
    } else if (accessApi) {
      $('#thepaperlink_apikey').val('');
      alert('\n please provide a valid apikey to use the extension\n get it from http://www.thepaperlink.com/reg\n');
      return false;
    }
  }
  if ( !localStorage.getItem('b_apikey_gold') ) {
    var userEmail = $('#pubmeder_email').val(),
      email_filter = /^[^@]+@[^@]+.[a-z]{2,}$/i,
      userApi = $('#pubmeder_apikey').val();
    if (userEmail && !email_filter.test(userEmail)) {
      alert('\n please provide a valid email address\n');
      $('#pubmeder_email').val('');
      $('#pubmeder_email').focus();
      return false;
    } else if (userEmail && (!userApi || userApi.length !== 32)) {
      alert('\n please provide a valid apikey\n get it from http://www.pubmeder.com/registration\n');
      $('#pubmeder_apikey').val('');
      $('#pubmeder_apikey').focus();
      return false;
    } else if (userEmail && userApi.length === 32) {
      req_b = valid_pubmeder(userEmail, userApi);
    }
  }
  if (req_a) {
    $.when(req_a).then(function () {
        if (localStorage.getItem('a_apikey_gold')) {
          location.reload();
        }
    });
  } else if (req_b) {
    $.when(req_b).then(function () {
        if (localStorage.getItem('b_apikey_gold')) {
          location.reload();
        }
    });
  } else if (req_a && req_b) {
    $.when(req_a, req_b).then(function () {
        if (localStorage.getItem('a_apikey_gold') && localStorage.getItem('b_apikey_gold')) {
          location.reload();
        }
    });
  } else {
    location.reload();
  }
  chrome.extension.sendRequest({load_common_values: 1});
}