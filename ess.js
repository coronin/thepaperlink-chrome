'use strict';

if (typeof _port === 'undefined') {
  const _port = chrome.runtime.connect({ name: 'background_port' });
}
let foundOrig;

function hideMore () {
  $('.moreAbout').addClass('Off');
  $('.AbsButton').removeClass('Off');
  $('.eSum').removeClass('Off');
  $('.pl4_clippy').fadeIn(1000);
}

function t_cont (copyId) {
  const cont = $('p#' + copyId.substr(4, copyId.length - 4)).text();
  _port && _port.postMessage({
    t_cont: cont.replace('check abstract', ''
                ).replace('save', '').replace('.PMID:', '.  PMID:'
                ).replace(/[^A-Za-z0-9 (),.:/-]/g, '').replace(/^\s+|\s+$/g, '')
  });
  $('#' + copyId).delay(200).fadeOut(500);
}

function peaks (name) {
  if (!name) { return; }
  let peaksURL = 'https://2.thepaperlink.com/?term=';
  let tpl = localStorage.getItem('thepaperlink_apikey') || '';
  if (localStorage.getItem('rev_proxy') === 'yes') {
    peaksURL = 'https://2.thepaperlink.cn/?term=';
  }
  if (tpl) { tpl = '&apikey=' + tpl; }
  chrome.tabs.create({ url: peaksURL + name + tpl, active: false });
}

function titleLink (ID) {
  let doiURL = 'https://dx.doi.org';
  let base = 'https://www.thepaperlink.com';
  if (localStorage.getItem('local_mirror')) {
    doiURL = 'https://' + localStorage.getItem('local_mirror');
  }
  if (localStorage.getItem('rev_proxy') === 'yes') {
    base = 'https://www.thepaperlink.cn';
  }
  if (/\d{2}\.\d{4,5}\//.test(ID)) {
    chrome.tabs.create({ url: doiURL + '/' + ID, active: false });
  } else if (/^PMC\d+$/.test(ID)) {
    chrome.tabs.create({
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + ID + '/?tool=thepaperlink_chrome',
      active: false
    });
  } else if (/^\d+$/.test(ID)) {
    chrome.tabs.create({
      url: base + '/:' + ID,
      active: false
    });
  } else {
    chrome.tabs.create({
      url: base + '/?q=' + ID,
      active: false
    });
  }
}

function eFetch (pmid) {
  $('.eSum').addClass('Off');
  $('#' + pmid).removeClass('Off');
  if ($('#abs_' + pmid).text()) {
    $('#abs_' + pmid + '> .moreAbout').removeClass('Off');
    $('.AbsButton').addClass('Off');
    return;
  } else if (localStorage.getItem('abs_' + pmid)) {
    $('.AbsButton').addClass('Off');
    $('#result').append('<p class="moreAbout">' + localStorage.getItem('abs_' + pmid) + '</p>');
    $('.moreAbout').on('click', function () { hideMore(); });
    $('.moreAbout').css('cursor', 'pointer');
    return;
  }
  $('.loadIcon').removeClass('Off');
  let url;
  let args = {
    apikey: localStorage.getItem('GUEST_APIKEY'),
    db: 'pubmed',
    id: pmid
  };
  if (localStorage.getItem('rev_proxy') === 'yes') {
    url = 'https://www.thepaperlink.cn/entrezajax/efetch';
  } else {
    url = 'https://www.thepaperlink.com/entrezajax/efetch';
  }
  if ( localStorage.getItem('tpl_ncbi_api') ) {
    args.ncbi_api = localStorage.getItem('tpl_ncbi_api');
  }
  $.getJSON(url, args, function (d) {
    _port && _port.postMessage({ sendID: pmid });
    $('.AbsButton').addClass('Off');
    $('.loadIcon').addClass('Off');
    $('#result').append('<div id="abs_' + pmid + '"></div>');
    const l = d.result.PubmedArticle[0]; let tmp; let j; let len;

    if (l.MedlineCitation.Article.Abstract) {
      const abstract = '<p class="moreAbout"><b style="text-decoration:underline">Abstract:</b> ' + l.MedlineCitation.Article.Abstract.AbstractText + '</p>';
      $('#abs_' + pmid).append(abstract);
      localStorage.setItem('abs_' + pmid, l.MedlineCitation.Article.Abstract.AbstractText); // v3
    } else {
      hideMore();
      return;
    }
    if (l.MedlineCitation.CommentsCorrectionsList) {
      let ref_list = '<p class="moreAbout"><b style="text-decoration:underline">References:</b> ';
      len = l.MedlineCitation.CommentsCorrectionsList.length;
      for (j = 0; j < len; j += 1) {
        if (j === 0) {
          tmp = '<a target="_blank" href="https://www.thepaperlink.com/:' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z]+). (\d{4})( [A-Z]|;).+/g, '$1 <span style="color:#999">$2</span>') + '</a>';
        } else {
          tmp = '; <a target="_blank" href="https://www.thepaperlink.com/:' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z()]+). (\d{4})( [A-Z]|;).+/g, '$1 <span style="color:#999">$2</span>') + '</a>';
        }
        ref_list += tmp;
      }
      ref_list += '</p>';
      $('#abs_' + pmid).append(ref_list);
    }

    if (l.MedlineCitation.Article.DataBankList) {
      let lsc = l.MedlineCitation.Article.DataBankList.length;
      let ls = l.MedlineCitation.Article.DataBankList[lsc - 1];
      while ((!ls || ls.DataBankName !== 'PDB') && lsc > 0) {
        lsc -= 1;
        ls = l.MedlineCitation.Article.DataBankList[lsc - 1];
      }
      if (lsc > 0) {
        let DataBank_list = '<p class="moreAbout"><b style="text-decoration:underline">PDB Files:</b> ';
        len = ls.AccessionNumberList.length;
        for (j = 0; j < len; j += 1) {
          if (j === 0) {
            tmp = '<a target="_blank" href="http://j.cail.cn/pdb/' + ls.AccessionNumberList[j] + '">' + ls.AccessionNumberList[j] + '</a> ';
          } else {
            tmp = '; <a target="_blank" href="http://j.cail.cn/pdb/' + ls.AccessionNumberList[j] + '">' + ls.AccessionNumberList[j] + '</a> ';
          }
          DataBank_list += tmp;
        }
        DataBank_list += '</p>';
        $('#abs_' + pmid).append(DataBank_list);
      }
    }

    if (l.MedlineCitation.Article.GrantList) {
      let grant_list = '<p class="moreAbout"><b style="text-decoration:underline">Fund By:</b> ';
      len = l.MedlineCitation.Article.GrantList.length;
      for (j = 0; j < len; j += 1) {
        if (j === 0) {
          tmp = l.MedlineCitation.Article.GrantList[j].Agency + ': ' + l.MedlineCitation.Article.GrantList[j].GrantID;
        } else {
          tmp = '; ' + l.MedlineCitation.Article.GrantList[j].Agency + ': ' + l.MedlineCitation.Article.GrantList[j].GrantID;
        }
        grant_list += tmp;
      }
      grant_list += '</p>';
      $('#abs_' + pmid).append(grant_list);
    }

    if (l.MedlineCitation.ChemicalList) {
      let keyChem = '<p class="moreAbout"><b style="text-decoration:underline">Chemical:</b> ';
      len = l.MedlineCitation.ChemicalList.length;
      for (j = 0; j < len; j += 1) {
        if (j === 0) {
          tmp = l.MedlineCitation.ChemicalList[j].NameOfSubstance;
        } else {
          tmp = '; ' + l.MedlineCitation.ChemicalList[j].NameOfSubstance;
        }
        keyChem += tmp;
      }
      keyChem += '</p>';
      $('#abs_' + pmid).append(keyChem);
    }

    if (l.MedlineCitation.MeshHeadingList) {
      let keyHead = '<p class="moreAbout"><b style="text-decoration:underline">Heading:</b> ';
      len = l.MedlineCitation.MeshHeadingList.length;
      for (j = 0; j < len; j += 1) {
        if (j === 0) {
          tmp = l.MedlineCitation.MeshHeadingList[j].DescriptorName;
        } else {
          tmp = '; ' + l.MedlineCitation.MeshHeadingList[j].DescriptorName;
        }
        keyHead += tmp;
      }
      keyHead += '</p>';
      $('#abs_' + pmid).append(keyHead);
    }

    $('.moreAbout').on('click', function () { hideMore(); });
    $('.moreAbout').css('cursor', 'pointer');
  }).fail(function (jqXHR, textStatus, errorThrown) {
    $('.loadIcon').addClass('Off');
    if (textStatus !== '503') {
      $('<div/>').html('<p>I am sorry. Nothing I can do with PMID:' + pmid + '</p>').appendTo('#result');
    } else {
      $('<div/>').html('<p>The server is overloaded. Try tomorrow!').appendTo('#result');
    }
  });
}

function eSummary (term, tabId, no_term_update) {
  const webenvCheck = /[a-zA-Z]/;
  const limit = localStorage.getItem('pubmed_limit') || '5';
  let urll = '';
  if (foundOrig === undefined) { foundOrig = $('#found').text(); }
  if (!(/^[0-9,]+$/.test('' + term)) && !no_term_update) {
    $('#ess_input').val(term);
  }
  if (webenvCheck.test(term)) {
    urll = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&retmax=' +
           limit + '&query_key=1&webenv=' + term;
  } else {
    urll = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&retmax=' +
           limit + '&id=' + term;
  }
  if ( localStorage.getItem('tpl_ncbi_api') ) {
    urll += '&api_key=' + localStorage.getItem('tpl_ncbi_api');
  }
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  $.get(urll,
    function (xml) {
      $('#result').html(''); // turn off loading
      let pmid;
      $(xml).find('DocSum').each(function () {
        const a = $(this).find('Item[Name="Author"]');
        let author_list;
        const pmc = $(this).find('Item[Name="pmc"]').text();
        const doi = $(this).find('Item[Name="doi"]').text();
        pmid = $(this).find('Id').text();
        const Title = $(this).find('Item[Name="Title"]').text();
        const PubDate = $(this).find('Item[Name="PubDate"]').text();
        const Source = $(this).find('Item[Name="Source"]').text();
        const Volume = $(this).find('Item[Name="Volume"]').text();
        const Pages = $(this).find('Item[Name="Pages"]').text();
        let esum_text;
        let tmp;

        if (a.length === 0) { return 1; } // 2018-10-4
        a.each(function (j) {
          tmp = $(this).text().replace(/\./g, '');
          if (j === 0) {
            author_list = '<b class="author" id="' + tmp + '">' + tmp + '</b>';
          } else if (j === (a.length - 1)) {
            author_list += ', <b class="author" id="' + tmp + '">' + tmp + '</b>';
          } else {
            author_list += ', ' + tmp;
          }
        });
        const titleLin = '. <span class="title" id="' + pmid + '">' + Title + '</span> ';
        esum_text = '<p class="eSum" id="' + pmid + '">';
        if (doi) {
          esum_text += '<span class="down" id="' + doi + '">&nbsp;&#8623;</span> ';
        }
        esum_text += author_list + titleLin + '<i>' + Source + '</i>, ' + PubDate;
        if (Volume) { esum_text += ', ' + Volume; }
        if (Pages) { esum_text += ': ' + Pages; }
        esum_text += '.<br/><span class="pmid" id="' + pmid + '">PMID:' + pmid + '</span> ';
        if (pmc) {
          esum_text += '&nbsp;<span class="pmid" id="' + pmc + '">' + pmc + '</span> ';
        }
        if (doi) {
          esum_text += '&nbsp;<span class="pmid" id="' + doi + '">DOI:' + doi + '</span> ';
        }
        esum_text += '<br/><button class="AbsButton" id="' + pmid + '">check abstract</button> ';
        esum_text += '&nbsp;<button class="saveButton" id="thepaperlink_save' + pmid + '">save</button> ';
        esum_text += '<span style="display:inline-block;float:right;cursor:pointer"><img class="pl4_clippy" title="copy to clipboard" src="' +
                     chrome.runtime.getURL('clippyIt.png') + '" alt="copy" width="14" height="14" id="copy' + pmid + '" />&nbsp;</span>';
        esum_text += '<img class="loadIcon Off" src="loadingLine.gif" alt="..."></p>';
        $('<div/>').html(esum_text).appendTo('#result');
      });
      if ($('#found').text() === 'Got 1.') {
        $('#found').html('&copy; ' + pmid);
        _port && _port.postMessage({
          from_popup_w_pmid: pmid,
          popup_tabid: tabId
        });
      }
      if ($('#result').text() === '') {
        $('#result').text('There was a glitch. Please try another search term.');
        $('#ess_input').val('');
        $('#ess_input').focus();
        return;
      }
      $('b.author').on('click', function () { peaks(this.id); });
      $('span.title').on('click', function () { titleLink(this.id); });
      $('span.down').on('click', function () { titleLink(this.id); });
      $('span.pmid').on('click', function () { titleLink(this.id); });
      $('img.pl4_clippy').on('click', function () { t_cont(this.id); });
      $('.AbsButton').on('click', function () { eFetch(this.id); });
      $('.saveButton').on('click', function () {
        // alert(this.id.substr(17));
        if (document.getElementById(this.id).textContent === 'save') {
          _port && _port.postMessage({ saveIt: this.id.substr(17) });
          document.getElementById(this.id).textContent = 'done!'; // cannot .text()
        } else {
          document.getElementById(this.id).setAttribute('style', 'display:none');
        }
      });
    },
    'xml'
  ).fail(function (e) {
    $('#result').text('esummary failed: ' + e);
  });
}

function eSS (search_term, tabId) {
  $('#ess_input').val(search_term);
  if (!tabId) {
    tabId = parseInt(document.title, 10);
  }
  if (foundOrig !== undefined) { $('#found').text(foundOrig); }
  let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&usehistory=y&term=' + search_term;
  if ( localStorage.getItem('tpl_ncbi_api') ) {
    url += '&api_key=' + localStorage.getItem('tpl_ncbi_api');
  }
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  if ($('#result').hasClass('Off')) {
    $('#result').removeClass('Off');
  }
  $.get(url,
    function (xml) {
      const WebEnv = $(xml).find('WebEnv').text();
      if (WebEnv) {
        eSummary(WebEnv, tabId, true);
      }
      const a = $(xml).find('IdList'); // cannot use Count
      let b = 0;
      a.each(function () {
        b += 1;
      });
      if ($('#found').html() === '&nbsp;') {
        $('#found').text('Got ' + b + '.');
      }
      if (b > 1) {
        _port && _port.postMessage({
          search_term: search_term,
          search_result_count: b,
          tabId: tabId
        });
        if ($('#found').length > 0) {
          $('#found').append('<span id="moreInfo">[more]</span>');
          $('#moreInfo').on('click', function () { titleLink(search_term); });
        }
      }
    },
    'xml'
  ).fail(function (e) {
    $('#result').html('eSS failed: ' + e);
  });
}

$(document).ready(function () {
  $('#clearPopup').on('click', function () {
    $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="..." />');
    $('#result').addClass('Off');
    $('#ess_input').val('Search PubMed');
    $('#found').text(foundOrig || '');
  });

  $('#ess_input').focus(function () {
    if (this.value === this.defaultValue) {
      this.value = '';
    }
  }).blur(function () {
    if (!this.value.length) {
      this.value = this.defaultValue;
    }
  });

  $('#ess_input').keydown(function (event) {
    if (event.keyCode === 13) {
      eSS(this.value, null);
    }
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tab = tabs[0]; let ID;
  document.title = '' + tab.id; // ess.html
  $('#result').removeClass('Off');
  if (tab.url.indexOf('chrome-extension://') === 0) {
    $('#result').html('ess.js used in history.html');
  } else if (tab.url.indexOf('//pubmed.cn/') > 0) {
    ID = tab.url.split('//pubmed.cn/')[1];
    if (/^\d+$/.test(ID)) {
      $('#found').html('&copy; ' + tab.url);
      eSummary(ID, tab.id);
    } else {
      eSS(ID.substr(9, ID.indexOf('&') - 9).replace(/\+/g, ' '), tab.id);
    }
  } else if (tab.url.indexOf('//f1000.com/prime/') > 0) {
    ID = tab.title.split('::')[0];
    $('#found').html('&copy; ' + tab.title.split('::')[1]);
    eSummary(ID, tab.id);
  } else if (tab.url.indexOf('//facultyopinions.com/article/') > 0) {  // 2022-3-20
    ID = tab.title.split('::')[0];
    $('#found').html('&copy; ' + tab.title.split('::')[1]);
    eSummary(ID, tab.id);
  } else if (tab.url.indexOf('//connect.h1.co/article/') > 0) {  // 2023-8-18
    ID = tab.title.split('::')[0];
    $('#found').html('&copy; ' + tab.title.split('::')[1]);
    eSummary(ID, tab.id);
  } else if (tab.url.indexOf('.storkapp.me/paper/') > 0) { // @@@@
    $('#found').html('&copy; /showPaper.php?' + tab.url.split('/showPaper.php?')[1]);
    eSummary(tab.title, tab.id);
  } else if (tab.url.indexOf('.storkapp.me/pubpaper/') > 0) {
    ID = tab.url.split('/pubpaper/')[1];
    $('#found').html('&copy; PMID:' + ID);
    eSummary(ID, tab.id);
  } else if (tab.url.indexOf('.biorxiv.org/content/') > 0) {
    $('#found').html('&nbsp;');
    eSS(tab.title.split('| bio')[0], tab.id);
  } else if (tab.url.indexOf('.medrxiv.org/content/') > 0) {
    $('#found').html('&nbsp;');
    eSS(tab.title.split('| med')[0], tab.id);
  } else if (tab.url.indexOf('//or.nsfc.gov.cn/handle/') > 0) {
    ID = tab.title.split('National Natural Science Foundation of China')[1].replace(':', '').replace(/^\s+|\s+$/g, '');
    $('#found').html('&copy; ' + tab.title.split(':')[0]);
    eSS(ID, tab.id);
  // } else if (tab.url.indexOf('//ir.nsfc.gov.cn/paperDetail/') > 0) {
  //   var hrefStr = tab.url.split('/');
  //   var l = hrefStr.length;
  //   var paperId = decodeURI(hrefStr[l - 1]);
  //   var queryJson = { achievementID: paperId };  //  javascripts/paperDetail.js
  //   $.ajax({
  //     type: 'POST',
  //     url: 'http://ir.nsfc.gov.cn/baseQuery/data/paperInfo',
  //     data: JSON.stringify(queryJson),
  //     contentType: 'application/json',
  //     success: function (resData, textStatus, jqXHR) {
  //       console.log(resData);
  //       resData = JSON.parse(resData);
  //       if (resData.code === '200' && resData.data[0].doi) {
  //         ID = resData.data[0].doi;
  //         $('#found').html('&copy; ' + (resData.data[0].fundProjectNo || ''
  //         ) + ' ' + (resData.data[0].fundProject || ''
  //         ) + ' ' + (resData.data[0].fieldCode || ''));
  //         _port && _port.postMessage({
  //           doi: resData.data[0].doi,
  //           prjID: resData.data[0].fundProjectNo
  //         });
  //         eSS(ID, tab.id);
  //       } else if (resData.code === '200') {
  //         ID = resData.data[0].englishTitle || resData.data[0].chineseTitle;
  //         $('#found').html('&copy; ' + (resData.data[0].fundProjectNo || ''
  //         ) + ' ' + (resData.data[0].fundProject || ''
  //         ) + ' ' + (resData.data[0].fieldCode || ''));
  //         eSS(ID, tab.id);
  //       } else {
  //         $('#found').html(textStatus);
  //       }
  //     }
  //   });
  } else if (tab.url.indexOf('//journals.plos.org/') > 0) {
    ID = tab.url.split('/article?id=')[1];
    $('#found').html('&copy; ' + ID);
    eSS(ID, tab.id);
  } else if (tab.url.indexOf('.sciencedirect.com/science/article/pii/') > 0) {
    ID = tab.url.split('/article/pii/')[1].split('?via')[0];
    $('#found').html('&copy; pii:' + ID);
    eSS(tab.title.split('- ScienceDirect')[0], tab.id);
  } else if (tab.url.indexOf('//elifesciences.org/') > 0) {
    ID = '10.7554/eLife.' + tab.url.split('/', 5)[4].split('.')[0];
    $('#found').html('&copy; ' + ID);
    eSS(ID, tab.id);
  } else if (tab.url.indexOf('.nature.com/articles/') > 0) {
    ID = '10.1038/' + tab.url.split('.nature.com/articles/')[1];
    $('#found').html('&copy; ' + ID);
    eSS(ID, tab.id);
  } else if (tab.url.indexOf('.cell.com/') > 0) {
    $('#found').html('&nbsp;');
    eSS(tab.title.split(': ')[0], tab.id);
  } else if (tab.url.indexOf('sciencemag.org/') > 0) {
    const urlBreaks = tab.url.split('/');
    ID = '10.1126/';
    if (urlBreaks[2] === 'immunology.sciencemag.org') {
      ID += 'sciimmunol.' + urlBreaks[6].replace('eaa', 'aa').replace('.full', '');
    } else if (urlBreaks[2] === 'stke.sciencemag.org') {
      ID += 'scisignal.' + urlBreaks[6].replace('eaa', 'aa').replace('.full', '');
    } else if (urlBreaks[2] === 'stm.sciencemag.org') {
      ID += 'scitranslmed.' + urlBreaks[6].replace('eaa', 'aa').replace('.full', '');
    // robotics, advances NOT in DOI
    // } else if (urlBreaks[2] === 'robotics.sciencemag.org') {
    //  ID += 'scirobotics.' + urlBreaks[6].replace('eaa', 'aa').replace('.full', '');
    // } else if (urlBreaks[2] === 'advances.sciencemag.org') {
    //  ID += 'sciadv.' + urlBreaks[6].replace('eaa', 'aa').replace('.full', '');
    } else if (urlBreaks[2] === 'spj.sciencemag.org' && urlBreaks[3] === 'research') {
      ID = '10.1155/' + urlBreaks[4] + '/' + urlBreaks[5];
    }
    if (ID !== '10.1126/') {
      $('#found').html('&copy; ' + ID);
      eSS(ID, tab.id);
    } else {
      $('#found').html('&nbsp;');
      eSS(tab.title.split(' | ')[0], tab.id);
    }
  // below, other sites enabled with chrome.declarativeContent.PageStateMatcher
  } else {
    chrome.storage.local.get(['tabId:' + tab.id], function (dd) {
      ID = dd['tabId:' + tab.id];
      if (/\d{2}\.\d{4,5}\//.test(ID) || /^PMC\d+$/.test(ID)) {
        $('#found').html('&copy; <span class="eSS" id="' + ID + '">' + ID + '</span>');
        $('.eSS').on('click', function () {
          eSS(this.id, tab.id);
        });
      } else if (/^[0-9,]+$/.test(ID)) { // 2018-10-4
        if (ID.indexOf(',') > 0) {
          $('#found').text('Found multiple PMID');
        } else {
          $('#found').html('&copy; <span>' + ID + '</span>');
        }
        eSummary(ID, tab.id);
      } else {
        $('#result').addClass('Off');
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (msg) { // 2020-2-4 ??
  alert('check runtime msg');
  console.log(msg);
});
_port.onMessage.addListener(function (msg) {
  console.log(msg);
  if (msg && msg.search_trend) {
    $('#found').append('<span style="color:blue;text-decoration:none;">&#x1f4c8;' +
                       msg.search_trend + '&nbsp;<span>');
    // sendResponse({});
  }
});
