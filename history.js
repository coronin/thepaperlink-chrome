'use strict';

const _port = chrome.runtime.connect({ name: 'background_port' });
const _bkg = chrome.extension.getBackgroundPage();
const alldigi = /^\d+$/;

function format_a_li (category, pmid, url, num) {
  const categoryLen = category.length;
  if (!url && !num) {
    let id_abs = pmid.split('====');
    if (id_abs[0]) {
      if (id_abs[1].indexOf('    Abstract') > 0) {
        id_abs[1] = id_abs[1].split('    Abstract')[1].replace(/^\s+|\s+$/g, '').replace(/\s\s+/g, ' ');
        localStorage.setItem('abs_' + id_abs[0], id_abs[1]);
      }
      $('#' + category + '_').append(
        '<li><button style="float:left" id="' + category + id_abs[0] + '">' + id_abs[0] +
          '</button> &nbsp; <textarea rows="3" cols="90">' + id_abs[1] + '</textarea></li>');
      $('#' + category + id_abs[0]).on('click', function () {
        // function in ess.js
        eSummary(this.id.substr(categoryLen, this.id.length - categoryLen), null);
      });
    }
  } else {
    $('#' + category + '_').append('<li><button id="' + category + pmid + '">' + pmid + '</button> &nbsp; ' +
        '<a target="_blank" href="' + url + '">/' + url.split('/', 4)[3] + '</a></li>');
    $('#' + category + pmid).on('click', function () {
      // function in ess.js
      eSummary(this.id.substr(categoryLen, this.id.length - categoryLen), null);
    });
    if (num) {
      $('#' + category + pmid).text(pmid + ' cited ' + num + ' times');
    }
  }
  if ($('#' + category + '_h2').hasClass('Off') && $('#' + category + '_').text() !== '') {
    $('#' + category + '_h2').removeClass('Off');
  }
}

function do_syncValues_post () {
  $('#undefined_clean').append('<li>Will get the entire storage.sync</li>');
  _port && _port.postMessage({ do_syncValues: 1 });
}

// 2015-12-9, 2018-10-1
function load_ALL_localStorage () {
  let i; let len; let aKey; let aVal; let a_key_split; let a_url; let dictKey;
  let syncValues = {}; const regAddr = /^1[A-Z]/;
  let syncValues_scholar = {}; // only sync recent 25
  $('#section_start_at').text('Only perform'); // From THE TIME WHEN YOU INSTALL
  $('#email_').html('');
  $('#shark_').html('');
  $('#scholar_').html('');
  $('#abstract_').html('');
  for (i = 0, len = localStorage.length; i < len; i += 1) {
    aKey = localStorage.key(i);
    aVal = localStorage.getItem(aKey);
    if (!aKey || aVal === null ||
        aKey.indexOf('undefined') > -1 ||
        aKey.indexOf('http://') > -1 ||
        aKey.indexOf('https://') > -1) {
      localStorage.removeItem(aKey);
      continue;
    } else if (aKey.indexOf('tabId:') === 0 ||
               aKey.indexOf('diff_') === 0 ||
              aKey.indexOf('day_') === 0) {
      continue;
    }
    if (aVal.indexOf('undefined') > -1 || aVal === '[object Object]' || aKey.indexOf('pmid_') === 0) {
      $('#undefined_clean').append('<li>' + aKey + ' : ' + aVal + ' &rarr; DELETED</li>');
      localStorage.removeItem(aKey);
      continue;
    }
    a_key_split = aKey.split('_');
    if (((aKey.indexOf('email_') === 0 ||
           aKey.indexOf('shark_') === 0 ||
           aKey.indexOf('scholar_') === 0) &&
          a_key_split[1] && aVal.indexOf(a_key_split[1]) === 0) ||
         aKey.indexOf('abs_') === 0) {
      if (a_key_split[1] && !alldigi.test(a_key_split[1])) {
        $('#undefined_clean').append('<li>' + aKey + ' &rarr; REMOVED</li>');
        localStorage.removeItem(aKey);
        continue;
      }
      dictKey = 'pmid_' + a_key_split[1];
      if (aKey.indexOf('email_') === 0) {
        if (!syncValues[dictKey]) {
          syncValues[dictKey] = {};
        } // 2018-9-27
        syncValues[dictKey].email = aVal;
        $('#email_').append('<li>' + aVal + '</li>');
      } else if (aKey.indexOf('shark_') === 0) {
        a_url = aVal.split(',')[1];
        if (a_url.indexOf('googletagmanager.com') > 0) {
          $('#undefined_clean').append('<li>' + aKey + ' : ' + aVal + ' &rarr; REMOVED</li>');
          localStorage.removeItem(aKey);
          continue;
        }
        if (!syncValues[dictKey]) {
          syncValues[dictKey] = {};
        } // 2018-9-27
        syncValues[dictKey].shark = aVal;
        format_a_li('shark', a_key_split[1], a_url);
      } else if (aKey.indexOf('scholar_') === 0) {
        if (!syncValues_scholar[dictKey]) {
          syncValues_scholar[dictKey] = {};
        }
        syncValues_scholar[dictKey].scholar = aVal;
        while (Object.keys(syncValues_scholar).length >= 25) { // 2020-8-5
          delete syncValues_scholar[Object.keys(syncValues_scholar)[0]];
        }
        a_url = 'https://scholar.google.com' + aVal.split(',')[2];
        format_a_li('scholar', a_key_split[1], a_url, aVal.split(',')[1]);
      } else if (aKey.indexOf('abs_') === 0) {
        if (aVal.indexOf('PMID: ') === 0 ||
            aVal.indexOf('Free ') === 0 ||
            aVal.indexOf(' [Indexed for ') === 0 ||
            aVal.indexOf('Loading ..') === 0 ||
            regAddr.test(aVal)) {
          $('#undefined_clean').append('<li>' + aKey + ' &rarr; REMOVE UNVALID ABSTRACT</li>');
          localStorage.removeItem(aKey);
          continue;
        }
        // 2018-10-1: chrome.storage.sync has a storage limit of only 100kb
        format_a_li('abstract', a_key_split[1] + '====' + aVal, null, null);
      }
    } else {
      syncValues[aKey] = '' + aVal;
    }
  }
  syncValues = Object.assign({}, syncValues, syncValues_scholar); // 2022-4-24
  _bkg.console.time('>> add to storage.sync');
  $('#undefined_clean').append('<li>Add to storage.sync ' + Object.keys(syncValues).length + ' items</li>');
  chrome.storage.sync.set(syncValues, function () {
    // unpack extension, TypeError: No matching signature
    _bkg.console.timeEnd('>> add to storage.sync');
  });
  if ($('#email_').text() === '') {
    $('#email_').addClass('Off');
    $('#email_h2').addClass('Off');
  }
  $('#load_ALL').off('click');
  $('#load_ALL').on('click', do_syncValues_post).text('storage.sync to local');
}

$(document).ready(function () {
  $('#load_ALL').on('click', load_ALL_localStorage).text('load all local records and sync');
});
