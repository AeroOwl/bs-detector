var data = [];
    shorts = [];
    toExpand = [];
    expanded = [];
    currentUrl = window.location.hostname;
    siteId = '';

function async(thisFunc, callback) {
  setTimeout(function() {
      thisFunc;
      if (callback) {callback();}
  }, 10);
}

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

chrome.runtime.sendMessage(null, {"operation": "passData"}, null, function(state) {
  data = state.sites;
  shorts = state.shorteners;
});

chrome.extension.sendMessage({}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            function expandLinks() {
              function getLinks() {
                $.each(shorts, function() {
                  var shortLink = 'a[href*="' + this + '"]';
                  $(shortLink).each(function() {
                    var theLink = ($(this).attr('href'));
                    toExpand.push(theLink);
                  });
                });
              }
              function processLinks() {
                if (toExpand) {
                  console.log('url array: ' + toExpand);
                  chrome.runtime.sendMessage(null, {"operation": "expandLinks", "shortLinks": toExpand.toString()}, null, function(response) {
                    console.log(response);
                    if (isJson(response)) {
                      expanded = JSON.parse(response);
                      $.each(expanded, function(key, value) {
                        $('a[href="' + value.requestedURL + '"]').attr('longurl', value.resolvedURL);
                      });
                    } else {
                     console.log('BS Detector could not expand shortened link');
                     console.log(response);
                    }
                  });
                }
              }
              async(getLinks(), function() {
                processLinks();
              });
            }

            function linkWarning() {
              $.each(data, function() {
                switch(currentUrl) {
                  case 'www.facebook.com':
                    siteId = 'facebook';
                  case 'twitter.com':
                    siteId = 'facebook';
                  case this.url:
                    siteId = 'badlink';
                  case 'www' + this.url:
                    siteId = 'badlink';
                  case default:
                    siteId = 'none';
                }
                console.log(currentUrl);
                console.log(this.url);
                console.log(siteId);

                if (siteId != 'badlink') {
                  var badLink = '[href*="' + this.url + '"],[data-expanded-url*="' + this.url +'"],[longurl*="' + this.url +'"]';
                }

                var classType = '';
                switch (this.type) {
                  case '':
                    classType = 'Classification Pending';
                    break;
                  case 'bias':
                    classType = 'Extreme Bias';
                    break;
                  case 'conspiracy':
                    classType = 'Conspiracy Theory';
                    break;
                  case 'fake':
                    classType = 'Fake News';
                    break;
                  case 'junksci':
                    classType = 'Junk Science';
                    break;
                  case 'rumors':
                    classType = 'Rumor Mill';
                    break;
                  case 'satire':
                    classType = 'Satire';
                    break;
                  case 'state':
                    classType = 'State News Source';
                    break;
                  case 'hate':
                    classType = 'Hate Group';
                    break;
                }
                var warnMessage = '💩 This website is not a reliable news source. Reason: ' + classType;

                function flagIt() {
                  if (!badLinkWrapper.hasClass('fFlagged')) {
                    badLinkWrapper.before('<div class="bs-alert-inline">' + warnMessage + '</div>');
                    badLinkWrapper.addClass('fFlagged');
                  }
                }

                switch(siteId) {
                  case 'badlink':
                    $('body').prepend('<div class="bs-alert"></div>')
                    $('bs-alert').css('display','block').append(warnMessage);
                    break;
                  case 'none':
                    $(badLink).each(function() {
                      $(this).addClass("hint--error hint--large hint--bottom");
                      $(this).attr('aria-label', warnMessage);
                    });
                    break;
                  case 'facebook':
                    var testLink = decodeURIComponent(this).substring(0, 30);
                    if (testLink = 'https://l.facebook.com/l.php?u=') {
                      thisUrl = decodeURIComponent(this).substring(30).split('&h=', 1);
                      $(this).attr('longurl', thisUrl);
                    }
                    $(badLink).each(function() {
                      if ($(this).parents('._1dwg').length == 1) {
                        badLinkWrapper = $(this).closest('.mtm');
                        flagIt();
                      }
                      if ($(this).parents('.UFICommentContent').length == 1) {
                        badLinkWrapper = $(this).closest('.UFICommentBody');
                        flagIt();
                      }
                    });
                    break;
                  case 'twitter':
                    $(badLink).each(function() {
                      if ($(this).parents('.TwitterCard').length == 1) {
                        badLinkWrapper = $(this).closest('.TwitterCard');
                        flagIt();
                      }
                    });
                    break;
                }
              });
            }

            function watchPage() {
              var mutationObserver = new MutationObserver(function() {
                trigger();
              });
              var targetNode = document.body;
              var observerConfig = {
                childList: true,
                subtree: true
              };
              mutationObserver.observe(targetNode, observerConfig);
            }

            function trigger() {
              // async(expandLinks(), function() {
              //   linkWarning();
              // });
              linkWarning();
            }

            trigger();
            watchPage();
          }
    }, 3);
});
