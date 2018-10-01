"use strict";

var DEBUG = false,
    i, len, aKey, aVal,
    _port = chrome.runtime.connect({name: 'background_port'}),
    bkg = chrome.extension.getBackgroundPage();

function format_a_li(category, pmid, url, num) {
  if (!url && !num) {
    var id_abs = pmid.split('====');
    $('#'+category+'_').append(
        '<li><button style="float:left" id="'+category+id_abs[0]+'">'+id_abs[0]+
        '</button> &nbsp; <textarea rows="3" cols="90">'+id_abs[1]+'</textarea></li>' );
    var categoryLen = category.length;
    $('#'+category+id_abs[0]).on('click', function () {
      // function in ess.js
      eSummary( this.id.substr(categoryLen, this.id.length-categoryLen), null );
    });
  } else {
    $('#'+category+'_').append('<li><button id="'+category+pmid+'">'+pmid+'</button> &nbsp; ' +
        '<a target="_blank" href="'+url+'">/' + url.split('/', 4)[3] + '</a></li>');
    var categoryLen = category.length;
    $('#'+category+pmid).on('click', function () {
      // function in ess.js
      eSummary( this.id.substr(categoryLen, this.id.length-categoryLen), null );
    });
    if (num) {
      $('#'+category+pmid).text(pmid + ' cited ' + num + ' times');
    }
  }
  if ( $('#'+category+'_h2').hasClass('Off') ) {
    $('#'+category+'_h2').removeClass('Off');
  }
}

function do_syncValues_post() {
  $('#undefined_clean').append('<li>Will get the entire storage.sync</li>');
  _port.postMessage({do_syncValues: 1});
}

// 2015-12-9, 2018-10-1
function load_ALL_localStorage() {
  var a_key_split, a_url, dictKey,
      syncValues = {};
  $('#section_start_at').text('From THE TIME WHEN YOU INSTALL the paper link 3');
  $('#email_').html('');
  $('#shark_').html('');
  $('#scholar_').html('');
  $('#abstract_').html('');
  for (i = 0, len = localStorage.length; i < len; i += 1) {
    aKey = localStorage.key(i);
    aVal = localStorage.getItem(aKey);
    if (!aKey || aVal === null) {
      localStorage.removeItem(aKey);
      continue;
    } else if (aKey.indexOf('tabId:') === 0) {
      continue;
    }
    if (aVal.indexOf('undefined') > -1 || aVal === '[object Object]' || aKey.indexOf('pmid_') === 0) {
      $('#undefined_clean').append('<li>'+aKey+' : '+aVal+' &rarr; ACTION: REMOVE</li>');
      localStorage.removeItem(aKey);
      continue;
    }
    a_key_split = aKey.split('_');
    if ( (( aKey.indexOf('email_') === 0 ||
           aKey.indexOf('shark_') === 0 ||
           aKey.indexOf('scholar_') === 0 ) &&
          a_key_split[1] && aVal.indexOf(a_key_split[1]) === 0) ||
         aKey.indexOf('abs_') === 0 ) {
      dictKey = 'pmid_'+a_key_split[1];
      if (aKey.indexOf('email_') === 0) {
        if (!syncValues[dictKey]) {
          syncValues[dictKey] = {};
        } // 2018-9-27
        syncValues[dictKey]['email'] = aVal;
        $('#email_').append('<li>'+aVal+'</li>');
      } else if (aKey.indexOf('shark_') === 0) {
        a_url = aVal.split(',')[1];
        if (a_url.indexOf('googletagmanager.com') > 0) {
          $('#undefined_clean').append('<li>'+aKey+' : '+aVal+' &rarr; ACTION: REMOVE</li>');
          localStorage.removeItem(aKey);
          continue;
        }
        if (!syncValues[dictKey]) {
          syncValues[dictKey] = {};
        } // 2018-9-27
        syncValues[dictKey]['shark'] = aVal;
        format_a_li('shark', a_key_split[1], a_url);
      } else if (aKey.indexOf('scholar_') === 0) {
        if (!syncValues[dictKey]) {
          syncValues[dictKey] = {};
        } // 2018-9-27
        syncValues[dictKey]['scholar'] = aVal;
        a_url = 'https://scholar.google.com' + aVal.split(',')[2];
        format_a_li('scholar', a_key_split[1], a_url, aVal.split(',')[1]);
      } else if (aKey.indexOf('abs_') === 0) {
        // 2018-10-1: chrome.storage.sync has a storage limit of only 100kb
        format_a_li('abstract', a_key_split[1]+'===='+aVal, null, null);
      }
    } else {
      syncValues[aKey] = '' + aVal;
    }
  }
  bkg.console.time('Add to storage.sync');
  $('#undefined_clean').append('<li>Add to storage.sync '+Object.keys(syncValues).length+' items</li>');
  chrome.storage.sync.set(syncValues, function () {
    bkg.console.timeEnd('Add to storage.sync');
  });
  if ($('#email_').text() === '') {
    $('#email_').addClass('Off');
    $('#email_h2').addClass('Off');
  }
  $('#load_ALL').off('click');
  $('#load_ALL').on('click', do_syncValues_post).text('re-sync to local');
}

$(document).ready(function () {
  $('#load_ALL').on('click', load_ALL_localStorage).text('load and sync all local records');
});