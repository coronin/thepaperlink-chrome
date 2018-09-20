  var tab = tabs[0],
      dotCheck = /\./,
      pmcCheck = /PMC/;
  var ID = localStorage.getItem("tabId:" + tab.id.toString());
  var url_trim = tab.url.substr(7, 25);
  if (tab.url.indexOf("chrome-extension://") === 0) {
    $("#result").html("popup.js used in background.html");
  } else {
    chrome.pageAction.setIcon({path: "19.png", tabId: tab.id});
    chrome.pageAction.setTitle({title: "extracted", tabId: tab.id});
    if (tab.url.substr(7, 26) !== url_trim) {
      url_trim += "&hellip;";
    }
    if (dotCheck.test(ID)) {
      $("#found").html("DOI:<span class=\'"eSS" id="' + ID + '">' + ID + '</span> found on page ' + url_trim);
      $(".eSS").on('click', function () { eSS(this.id); });
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
