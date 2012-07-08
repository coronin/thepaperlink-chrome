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
  var url, args = {'apikey' : 'ab25c21c079653919d9b53213ac8cc6e',
                       'db' : 'pubmed',
                       'id' : pmid};
  if (localStorage.getItem('rev_proxy') === 'yes') {
    url = 'http://43.pl4.me/efetch';
  } else {
    url = 'https://entrezajax3.appspot.com/efetch';
  }
  $.getJSON(url, args, function (d) {
    $('.AbsButton').addClass('Off');
    $('.loadIcon').addClass('Off');
    $('#result').append('<div id="abs_' + pmid + '"></div>');
    var l = d.result[0];

    if (l.MedlineCitation.Article.Abstract) {
      var abstract = '<p class="moreAbout"><b><u>Abstract</u>: </b>' + l.MedlineCitation.Article.Abstract.AbstractText + '</p>';
      $('#abs_' + pmid).append(abstract);
    }
    if (l.MedlineCitation.CommentsCorrectionsList) {
      var ref_list = '<p class="moreAbout"><b><u>References</u>: </b>', j;
      for (j = 0; j < l.MedlineCitation.CommentsCorrectionsList.length; j += 1) {
        if (j === 0) {
          ref_list += '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '/?tool=thepaperlink_chrome">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z]+). (\d{4})( [A-Z]|;).+/g, '$1 <font style="color:#999;">$2</font>') + '</a>';
        } else {
          ref_list += '; <a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' + l.MedlineCitation.CommentsCorrectionsList[j].PMID + '/?tool=thepaperlink_chrome">' + l.MedlineCitation.CommentsCorrectionsList[j].RefSource.replace(/([a-zA-Z()]+). (\d{4})( [A-Z]|;).+/g, '$1 <font style="color:#999;">$2</font>') + '</a>';
        }
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
        var DataBank_list = '<p class="moreAbout"><b><u>PDB Files</u>: </b>', jm;
        for (jm = 0; jm < ls.AccessionNumberList.length; jm += 1) {
          if (jm === 0) {
            DataBank_list += '<a target="_blank" href="http://j.pl4.me/pdb/' + ls.AccessionNumberList[jm] + '">' + ls.AccessionNumberList[jm] + '</a> ';
          } else {
            DataBank_list += '; <a target="_blank" href="http://j.pl4.me/pdb/' + ls.AccessionNumberList[jm] + '">' + ls.AccessionNumberList[jm] + '</a> ';
          }
        }
        DataBank_list += '</p>';
        $('#abs_' + pmid).append(DataBank_list);
      }
    }

    if (l.MedlineCitation.Article.GrantList) {
      var grant_list = '<p class="moreAbout"><b><u>Fund By</u>: </b>', jj;
      for (jj = 0; jj < l.MedlineCitation.Article.GrantList.length; jj += 1) {
        if (jj === 0) {
          grant_list += l.MedlineCitation.Article.GrantList[jj].Agency + ': ' + l.MedlineCitation.Article.GrantList[jj].GrantID;
        } else {
          grant_list += '; ' + l.MedlineCitation.Article.GrantList[jj].Agency + ': ' + l.MedlineCitation.Article.GrantList[jj].GrantID;
        }
      }
      grant_list += '</p>';
      $('#abs_' + pmid).append(grant_list);
    }

    if (l.MedlineCitation.ChemicalList) {
      var keyChem = '<p class="moreAbout"><b><u>Chemical</u>: </b>', jk;
      for (jk = 0; jk < l.MedlineCitation.ChemicalList.length; jk += 1) {
        if (jk === 0) {
          keyChem += l.MedlineCitation.ChemicalList[jk].NameOfSubstance;
        } else {
          keyChem += '; ' + l.MedlineCitation.ChemicalList[jk].NameOfSubstance;
        }
      }
      keyChem += '</p>';
      $('#abs_' + pmid).append(keyChem);
    }

    if (l.MedlineCitation.MeshHeadingList) {
      var keyHead = '<p class="moreAbout"><b><u>Heading</u>: </b>', jl;
      for (jl = 0; jl < l.MedlineCitation.MeshHeadingList.length; jl += 1) {
        if (jl === 0) {
          keyHead += l.MedlineCitation.MeshHeadingList[jl].DescriptorName;
        } else {
          keyHead += '; ' + l.MedlineCitation.MeshHeadingList[jl].DescriptorName;
        }
      }
      keyHead += '</p>';
      $('#abs_' + pmid).append(keyHead);
    }

    $('.moreAbout').on('click', function () { hideMore(); });
  }).error(function () {
    $('<div/>').html('<p>I am sorry. Nothing I can do with PMID:' + pmid + '</p>').appendTo('#result');
  });
}

function eSummary(term) {
  var webenvCheck = /[a-zA-Z]/,
    urll = '';
  if (webenvCheck.test(term)) {
    urll = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&retmax=12&query_key=1&webenv=' + term;
  } else {
    urll = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?tool=thepaperlink_chrome&db=pubmed&retmode=xml&id=' + term;
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
          esum_text;

        a.each(function (j) {
          if (j === 0) {
            author_list = '<b>' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.</b>';
          } else if (j === (a.length - 1)) {
            author_list += ', <b>' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.</b>';
          } else {
            author_list += ', ' + $(this).text().replace(/ (\w)(\w)/g, ' $1.$2') + '.';
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
  ).error(function () {
    $('#result').html('I am very sorry, but I failed. Try later?');
  });
}

function eSS(search_term) {
  var url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&usehistory=y&term=' + search_term;
  $('#result').html('loading <img class="loadIcon" src="loadingLine.gif" alt="...">');
  $('#result').removeClass('Off');
  $.get(url,
    function (xml) {
      var WebEnv = $(xml).find('WebEnv').text();
      eSummary(WebEnv);
    },
    'xml'
  ).error(function () {
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
    if (event.keyCode == 13) {
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
  chrome.pageAction.setIcon({path: '19.png', tabId: tab.id});
  chrome.pageAction.setTitle({title: 'extracted', tabId: tab.id});
  if (tab.url.substr(7, 26) !== url_trim) {
    url_trim += '&hellip;';
  }
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
});