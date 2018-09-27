"use strict";

function hideMore() {
  $('.moreAbout').addClass('Off');
  $('.AbsButton').removeClass('Off');
  $('.eSum').removeClass('Off');
}

function eFetch(pmid) {
  $('.eSum').addClass('Off');
  $('#' + pmid).removeClass('Off');
  if ($('#abs_' + pmid).text()) {
    $('#abs_' + pmid + '> .moreAbout').removeClass('Off');
    $('.AbsButton').addClass('Off');
    return;
  }
  $('.loadIcon').removeClass('Off');
  var url, args = {apikey : localStorage.getItem('GUEST_APIKEY'),
    db : 'pubmed',
    id : pmid};
  if (localStorage.getItem('https_failed') || localStorage.getItem('rev_proxy') === 'yes') {
    url = 'http://phd.cail.cn/entrezajax/efetch';
  } else {
    url = 'https://pubget-hrd.appspot.com/entrezajax/efetch';
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
  }).fail(function () {
    $('.loadIcon').addClass('Off');
    $('<div/>').html('<p>I am sorry. Nothing I can do with PMID:' + pmid + '</p>').appendTo('#result');
  });
}

function eSummary(term) {
  var webenvCheck = /[a-zA-Z]/,
      limit = localStorage.getItem('pubmed_limit') || '10',
      urll = '';
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

          a.each(function (j) {
            if (j === 0) {
              author_list = '<b>' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.</b>';
            } else if (j === (a.length - 1)) {
              tmp = ', <b>' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.</b>';
              author_list += tmp;
            } else {
              tmp = ', ' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.';
              author_list += tmp;
            }
          });

          if (pmc) {
            titleLin = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pmc/articles/' + pmc + '/?tool=thepaperlink_chrome">' + Title + '</a> ';
          } else if (doi) {
            titleLin = '<a target="_blank" href="http://dx.doi.org/' + doi + '">' + Title + '</a> ';
          } else {
            titleLin = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + pmid + '/?tool=thepaperlink_chrome">' + Title + '</a> ';
          }

          esum_text = '<p class="eSum" id="' + pmid + '">' + author_list + ' (' + PubDate + '). ' + titleLin + Source + '.  <i>' + Volume + '</i>, ' + Pages + '<br/><button class="AbsButton" id="' + pmid + '"> More about </button><a id="pmid" target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + pmid + '/?tool=thepaperlink_chrome">PMID:' + pmid + '</a> <img class="loadIcon Off" src="loadingLine.gif" alt="..."></p>';
          $('<div/>').html(esum_text).appendTo('#result');
        });
        $('.AbsButton').on('click', function () { eFetch(this.id); });
        $('#result').removeClass('Off');
      },
      'xml'
  ).fail(function () {
    $('#result').html('I am very sorry, but I failed. Try later?');
  });
}

function eSS(search_term) {
  var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&usehistory=y&term=' + search_term;
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  $('#result').removeClass('Off');
  $.get(url,
      function (xml) {
        var WebEnv = $(xml).find('WebEnv').text();
        if (WebEnv) {
          eSummary(WebEnv);
        }
      },
      'xml'
  ).fail(function () {
    $('#result').html('Sorry, I failed. Try later?');
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
      eSS( this.value );
    }
  });
});

chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  var tab = tabs[0],
      ID = localStorage.getItem('tabId:' + tab.id.toString()),
      dotCheck = /\./,
      pmcCheck = /PMC/,
      url_trim = tab.url.substr(7, 25);

  if (tab.url.indexOf('chrome-extension://') === 0) {
    $('#result').html('ess.js used in background.html');

  } else {
    // chrome.pageAction.setIcon({path: '19.png', tabId: tab.id});
    // chrome.pageAction.setTitle({title: 'extracted', tabId: tab.id});
    // 2018-9-26 @@@@
    if (dotCheck.test(ID)) {
      $('#found').html('DOI:<span class="eSS" id="' + ID + '">' + ID + '</span> found on page ' + url_trim);
      $('.eSS').on('click', function () { eSS(this.id); });
    } else if (pmcCheck.test(ID)) {
      $('#found').html('PMCID:<span class="eSS" id="' + ID + '">' + ID + '</span> found on page ' + url_trim);
      $('.eSS').on('click', function () { eSS(this.id); });
    } else {
      $('#result').removeClass('Off');
      $('#found').html('PMID:<span>' + ID + '</span> found on page ' + url_trim);
      eSummary(ID);
      //save_pubmeder
    }
  }

});
