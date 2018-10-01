"use strict";

function hideMore() {
  $('.moreAbout').addClass('Off');
  $('.AbsButton').removeClass('Off');
  $('.eSum').removeClass('Off');
}

function peaks(name) {
  if (!name) { return; }
  var peaksURL = 'https://2.thepaperlink.com/?term=';
  if (localStorage.getItem('https_failed') || localStorage.getItem('rev_proxy') === 'yes') {
    peaksURL = 'https://2.zhaowenxian.com/?term=';
  }
  chrome.tabs.create({url: peaksURL + name, active: false});
}

function titleLink(ID) {
  var doiURL = 'https://dx.doi.org';
  if (localStorage.getItem('local_mirror')) {
    doiURL = 'https://' + localStorage.getItem('local_mirror');
  }
  if (/\d{2}\.\d{4}\//.test(ID)) {
    chrome.tabs.create({url: doiURL + '/' + ID, active: false});

  } else if (/^PMC\d+$/.test(ID)) {
    chrome.tabs.create({url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + ID + '/?tool=thepaperlink_chrome',
                        active: false });
  } else if (/^\d+$/.test(ID)) {
    chrome.tabs.create({url: 'https://www.ncbi.nlm.nih.gov/pubmed/' + ID + '/?tool=thepaperlink_chrome',
                        active: false });
  } else {
    chrome.tabs.create({url: 'https://www.ncbi.nlm.nih.gov/pubmed/?term=' + ID + '&tool=thepaperlink_chrome',
                        active: false });
  }
}

function eFetch(pmid) {
  $('.eSum').addClass('Off');
  $('#' + pmid).removeClass('Off');
  if ( $('#abs_' + pmid).text() ) {
    $('#abs_' + pmid + '> .moreAbout').removeClass('Off');
    $('.AbsButton').addClass('Off');
    return;
  } else if ( localStorage.getItem('abs_'+pmid) ){
    $('.AbsButton').addClass('Off');
    $('#result').append('<p class="moreAbout">'+localStorage.getItem('abs_'+pmid)+'</p>');
    $('.moreAbout').on('click', function () { hideMore(); });
    $('.moreAbout').css('cursor', 'pointer');
    return;
  }
  $('.loadIcon').removeClass('Off');
  var url, args = {apikey : localStorage.getItem('GUEST_APIKEY'),
    db : 'pubmed',
    id : pmid};
  if (localStorage.getItem('https_failed') || localStorage.getItem('rev_proxy') === 'yes') {
    url = 'https://www.zhaowenxian.com/entrezajax/efetch';
  } else {
    url = 'https://www.thepaperlink.com/entrezajax/efetch';
  }
  $.getJSON(url, args, function (d) {
    $('.AbsButton').addClass('Off');
    $('.loadIcon').addClass('Off');
    $('#result').append('<div id="abs_' + pmid + '"></div>');
    var l = d.result.PubmedArticle[0], tmp, j, len;

    if (l.MedlineCitation.Article.Abstract) {
      var abstract = '<p class="moreAbout"><b style="text-decoration:underline">Abstract:</b> ' + l.MedlineCitation.Article.Abstract.AbstractText + '</p>';
      $('#abs_' + pmid).append(abstract);
      localStorage.setItem('abs_'+pmid, l.MedlineCitation.Article.Abstract.AbstractText); // v3
    } else {
      hideMore();
      return;
    }
    if (l.MedlineCitation.CommentsCorrectionsList) {
      var ref_list = '<p class="moreAbout"><b style="text-decoration:underline">References:</b> ';
      len = l.MedlineCitation.CommentsCorrectionsList.length;
      for (j = 0; j < len; j += 1) {
        if (j === 0) {
          tmp = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '/?tool=thepaperlink_chrome">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z]+). (\d{4})( [A-Z]|;).+/g, '$1 <span style="color:#999">$2</span>') + '</a>';
        } else {
          tmp = '; <a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '/?tool=thepaperlink_chrome">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z()]+). (\d{4})( [A-Z]|;).+/g, '$1 <span style="color:#999">$2</span>') + '</a>';
        }
        ref_list += tmp;
      }
      ref_list += '</p>';
      $('#abs_' + pmid).append(ref_list);
    }

    if (l.MedlineCitation.Article.DataBankList) {
      var lsc = l.MedlineCitation.Article.DataBankList.length,
          ls = l.MedlineCitation.Article.DataBankList[lsc - 1];
      while ((!ls || ls.DataBankName !== 'PDB') && lsc > 0) {
        lsc -= 1;
        ls = l.MedlineCitation.Article.DataBankList[lsc - 1];
      }
      if (lsc > 0) {
        var DataBank_list = '<p class="moreAbout"><b style="text-decoration:underline">PDB Files:</b> ';
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
      var grant_list = '<p class="moreAbout"><b style="text-decoration:underline">Fund By:</b> ';
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
      var keyChem = '<p class="moreAbout"><b style="text-decoration:underline">Chemical:</b> ';
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
      var keyHead = '<p class="moreAbout"><b style="text-decoration:underline">Heading:</b> ';
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

  }).fail(function () {
    $('.loadIcon').addClass('Off');
    $('<div/>').html('<p>I am sorry. Nothing I can do with PMID:' + pmid + '</p>').appendTo('#result');
  });
}

function eSummary(term, tabId) {
  var webenvCheck = /[a-zA-Z]/,
      limit = localStorage.getItem('pubmed_limit') || '5',
      urll = '';
  if (term.substr(0,5) !== 'NCID_') {
    $('#ess_input').val(term);
  }
  if (webenvCheck.test(term)) {
    urll = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&retmax=' +
        limit + '&query_key=1&webenv=' + term;
  } else {
    urll = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&retmax=' +
        limit + '&id=' + term;
  }
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  $.get(urll,
      function (xml) {
        $('#result').html(''); // turn off loading
        $(xml).find('DocSum').each(function () {
          var a = $(this).find('Item[Name="Author"]'),
              author_list,
              pmc = $(this).find('Item[Name="pmc"]').text(),
              doi = $(this).find('Item[Name="doi"]').text(),
              pmid = $(this).find('Id').text(),
              Title = $(this).find('Item[Name="Title"]').text(),
              titleLin,
              PubDate = $(this).find('Item[Name="PubDate"]').text(),
              Source = $(this).find('Item[Name="Source"]').text(),
              Volume = $(this).find('Item[Name="Volume"]').text(),
              Pages = $(this).find('Item[Name="Pages"]').text(),
              esum_text,
              tmp;
          if (tabId && pmid) { chrome.tabs.sendMessage(tabId, {sendID: pmid}); }

          a.each(function (j) {
            tmp = $(this).text().replace(/\./g, '');
            if (j === 0) {
              author_list = '<b class="author" id="'+tmp+'">' + tmp + '</b>';
            } else if (j === (a.length - 1)) {
              author_list += ', <b class="author" id="'+tmp+'">' + tmp + '</b>';
            } else {
              author_list += ', ' + tmp;
            }
          });

          if (pmc) {
            titleLin = '<span class="title" id="' + pmc + '">' + Title + '</span> ';
          } else if (doi) {
            titleLin = '<span class="title" id="' + doi + '">' + Title + '</span> ';
          } else {
            titleLin = '<span class="title" id="' + pmid + '">' + Title + '</span> ';
          }

          esum_text = '<p class="eSum" id="' + pmid + '">' + author_list + ' (' + PubDate + '). ' + titleLin + '<i>' + Source + '</i>';
          if (Volume) { esum_text += ', ' + Volume; }
          if (Pages) { esum_text += ':' + Pages; }
          esum_text += '.<br/><button class="AbsButton" id="' + pmid + '"> More about </button> <span class="pmid" id="' +
              pmid + '">PMID:' + pmid + '</span> <img class="loadIcon Off" src="loadingLine.gif" alt="..."></p>';
          $('<div/>').html(esum_text).appendTo('#result');
        });
        $('b.author').on('click', function () { peaks(this.id); });
        $('b.author').css('cursor', 'pointer');
        $('span.title').on('click', function () { titleLink(this.id); });
        $('span.title').css({'cursor':'pointer', 'font-weight':'bold', 'color':'blue'});
        $('span.pmid').on('click', function () { titleLink(this.id); });
        $('span.pmid').css('cursor', 'pointer');
        $('.AbsButton').on('click', function () { eFetch(this.id); });
      },
      'xml'
  ).fail(function () {
    $('#result').html('I failed to fetch the summary. Try later?');
  });
}

function eSS(search_term, tabId) {
  $('#ess_input').val(search_term);
  if (!tabId) {
    tabId = parseInt(document.title, 10);
  }
  var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&usehistory=y&term=' + search_term;
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  if ( $('#result').hasClass('Off') ) {
    $('#result').removeClass('Off');
  }
  $.get(url,
      function (xml) {
        var WebEnv = $(xml).find('WebEnv').text();
        chrome.tabs.sendMessage(tabId, {search_term: search_term});

        console.log( $(xml).text() );

        if (WebEnv) {
          eSummary(WebEnv, tabId);
        }
      },
      'xml'
  ).fail(function () {
    $('#result').html('I failed to find anything. Try later?');
  });
}

$(document).ready(function () {
  $('#clearPopup').on('click', function () {
    $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="..." />');
    $('#result').addClass('Off');
    $('#ess_input').val('Search PubMed');
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
      eSS( this.value, null );
    }
  });
});

chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  var tab = tabs[0], ID;
  document.title = '' + tab.id;
  $('#result').removeClass('Off');
  if (tab.url.indexOf('chrome-extension://') === 0) {
    $('#result').html('ess.js used in history.html');

  } else if (tab.url.indexOf('//pubmed.cn/') > 0) {
    ID = tab.url.split('//pubmed.cn/')[1];
    if (/^\d+$/.test(ID)) {
      $('#found').html('<div id="thepaperlink_bar">PMID found on page '+tab.url+'</div>');
      $('#ess_input').val(ID);
      eSummary(ID, tab.id);
      //chrome.tabs.sendMessage(tab.id, {from_nonF1000: ID});
    } else {
      eSS( ID.substr(9, ID.indexOf('&')-9).replace(/\+/g, ' '), tab.id );
    }

  } else if (tab.url.indexOf('.storkapp.me/paper/') > 0) {
    ID = tab.title;
    $('#found').html('PMID found on /showPaper.php?'+tab.url.split('/showPaper.php?')[1]);
    $('#ess_input').val(ID);
    eSummary(ID, tab.id);

  } else if (tab.url.indexOf('//or.nsfc.gov.cn/handle/') > 0) {
    ID = tab.title.split('National Natural Science Foundation of China')[1].replace(':', '').replace(/^\s+|\s+$/g, '');
    $('#found').html(tab.title.split(':')[0]);
    $('#ess_input').val(ID);
    eSS(ID, tab.id);

  } else if (tab.url.indexOf('//f1000.com/prime/') > 0) {
    ID = tab.title.split('::')[0];
    $('#found').html(tab.title.split('::')[1]);
    $('#ess_input').val(ID);
    eSummary(ID, tab.id);

  } else { // @@@@
  chrome.storage.local.get(['tabId:'+tab.id], function (dd) {
    ID = dd['tabId:'+tab.id];
    if (/\d{2}\.\d{4}\//.test(ID)) {
      $('#found').html('Found DOI <span class="eSS" id="' + ID + '">' + ID + '</span>');
      $('.eSS').on('click', function () {
        eSS(this.id, tab.id);
      });
    } else if (/^PMC\d+$/.test(ID)) {
      $('#found').html('Found PMCID <span class="eSS" id="' + ID + '">' + ID + '</span>');
      $('.eSS').on('click', function () {
        eSS(this.id, tab.id);
      });
    } else if (/^\d+$/.test(ID)) {
      $('#found').html('Maybe PMID <span>' + ID + '</span>');
      eSummary(ID, tab.id);
    } else {
      $('#result').addClass('Off');
    }
  }); }
});

chrome.runtime.onMessage.addListener(function (msg) {
    // @@@@
    chrome.extension.getBackgroundPage().console.log(msg);
});