// Page objects common to the autocompleter test pages.
function BasePage() {
  var searchResID = 'searchResults';
  var searchResCSS = '#'+searchResID;
  var searchResults = this.searchResults = $(searchResCSS);
  this.searchResCSS = searchResCSS;
  this.allSearchRes = element.all(by.css(searchResCSS + ' li'));
  this.expandLink = $('#moreResults');
  this.firstSugLink = element.all(by.css('.ui-dialog a')).first(); // first suggestion
  this.suggestionDialog = element(by.css('.ui-dialog'));
  this.suggestionDialogClose = element(by.css('.ui-dialog button'));
  this.completionOptionsCSS = '#completionOptions';
  this.completionOptionsScrollerCSS = '#completionOptionsScroller';
  this.completionOptionsScroller = $(this.completionOptionsScrollerCSS);

  /**
   *  Returns the list item in the search results list at the given position
   *  number (starting at 1).  The returned item might be a heading.
   * @param pos the item position number (starting at 1).
   */
  this.searchResult = function(pos) {
    return $(searchResCSS + ' li:nth-child('+pos+'), '+
      searchResCSS + ' tr:nth-child('+pos+')');
  };

  /**
   *  Returns the item in the search results list at the given position
   *  number (starting at 1), assuming the table format is being used.  (This is
   *  the same thing as "searchResult" but for the table format.)  The returned
   *  item might be a heading.
   * @param pos the item position number (starting at 1).
   */
  this.tableSearchResult = function(pos) {
    return $(searchResCSS + ' tr:nth-child('+pos+')');
  };

  this.firstSearchRes = this.searchResult(1);
  this.secondSearchRes = this.searchResult(2);
  this.thirdSearchRes = this.searchResult(3);
  this.fourthSearchRes = this.searchResult(4);
  this.fifthSearchRes = this.searchResult(5);
  this.tenthSearchRes = this.searchResult(10);

  /**
   *  Returns the results of getSelectedCodes and getSelectedItems for the
   *  autocompleter on the given field ID.  The two are returned as elements of
   *  an array.
   * @param fieldID the field for the autocompleter.
   */
  this.getSelected = function(fieldID) {
    // Use a string rather than a function object so fieldID can be passed to
    // the browser.
    return browser.driver.executeScript(
      'var ac = jQuery("#'+fieldID+'")[0].autocomp;'+
      'return [ac.getSelectedCodes(), ac.getSelectedItems()];'
    );
  };


  /**
   *  Returns the results of getSelectedItems for the
   *  autocompleter on the given field ID.
   * @param fieldID the field for the autocompleter.
   */
  this.getSelectedItems = function(fieldID) {
    // Use a string rather than a function object so fieldID can be passed to
    // the browser.
    return browser.driver.executeScript(
      'var ac = jQuery("#'+fieldID+'")[0].autocomp;'+
      'return ac.getSelectedItems();'
    );
  };


  /**
   *  Checks the values of getSelectedCodes and getSelectedItems for the
   *  autocompleter on the given field ID.
   * @param fieldID the field for the autocompleter.
   * @param t2c a hash from display strings to code values.  (If there are no
   * code values, the hash still must be passed, but the values should be null.)
   */
  this.checkSelected = function(fieldID, t2c) {
    t2c = JSON.parse(JSON.stringify(t2c)); // the checks are done later, so clone
    this.getSelected(fieldID).then(function(data) {
      var codes = data[0];
      var texts = data[1];
      var expectedLength = Object.keys(t2c).length;
      expect(codes.length).toBe(expectedLength);
      expect(texts.length).toBe(expectedLength);
      var actualT2C = {};
      for (var i=0; i<expectedLength; ++i)
        actualT2C[texts[i]] = codes[i];
      expect(actualT2C).toEqual(t2c);
    });
  };


  /**
   *  Returns true if the selection list is currently visible, and false if not.
   */
  this.listIsVisible = function() {
    return browser.driver.executeScript(
      'return jQuery("#'+searchResID+'")[0].style.visibility === "visible"'
    );
  };


  /**
   *  Returns the number of items shown in the list.
   */
  this.shownItemCount = function() {
    return browser.driver.executeScript(
      'return Def.Autocompleter.listItemElements().length;'
    );
  };


  /**
   *  Returns the message with the count and total count that appears below the
   *  list.
   */
  this.listCountMessage = function() {
    return $('#searchCount').getText();
  };


  /**
   *  Erases the value in the given field.  Leaves the focus in the field
   *  afterward.
   */
  this.clearField = function(field) {
    field.click();
    field.sendKeys(protractor.Key.CONTROL, 'a'); // select all
    field.sendKeys(protractor.Key.BACK_SPACE); // clear the field
  };


  /**
   *  Returns the scroll position of the list's scrollbar.
   */
  this.listScrollPos = function() {
    return browser.driver.executeScript(
      'return jQuery("'+this.completionOptionsScrollerCSS+'")[0].scrollTop;'
    );
  };

  /**
   * Wait for the autocomplete results to be shown
   */
  this.waitForSearchResults = function() {
    browser.wait(function() {
      return searchResults.isDisplayed();
    }, 5000);
  };

  /**
   * Wait for the autocomplete results to not be shown
   */
  this.waitForNoSearchResults = function() {
    browser.wait(function() {
      return searchResults.isDisplayed().then(function(val) {
        return !val;
      });
    }, 5000);
  };


  /**
   *  Waits for the page to stop scrolling the search results into view.
   * @param fieldID the field whose autocompleter is doing the scrolling.
   */
  this.waitForScrollToStop = function(fieldID) {
    if (!fieldID)
      throw 'Missing fieldID parameter in waitForScrollToStop';
    function waitForEffectToFinish(fieldID) {
      var ac = $('#'+fieldID)[0].autocomp;
      return !ac.lastScrollEffect_ || ac.lastScrollEffect_.state === 'finished';
    }
    browser.wait(function() {
      return browser.driver.executeScript(waitForEffectToFinish, fieldID);
    });
  };


  /**
   *  Returns the number of times an AJAX call has been made.
   */
  this.getAjaxCallCount = function() {
    return browser.driver.executeScript('return jQuery.ajax.ajaxCtr');
  };


  /**
   *  Sets the field's value to the given text string, and picks the first
   *  autocompletion result.
   * @param field the autocompleting field
   * @param text the text with which to autocomplete
   */
  this.autocompPickFirst = function(field, text) {
    this.autocompPickNth(field, text, 1);
  };


  /**
   *  Sets the field's value to the given text string, and picks the nth
   *  autocompletion result.
   * @param field the autocompleting field
   * @param text the text with which to autocomplete.  This can be null or the
   *  empty string for prefetch lists.
   * @param n the number of the list item to pick (starting at 1).
   */
  this.autocompPickNth = function(field, text, n) {
    this.clearField(field);
    expect(field.getAttribute('value')).toEqual('');
    field.click();
    if (text)
      this.sendKeys(field, text);
    this.waitForSearchResults();
    this.searchResult(n).click();
  };


  /**
   *  Returns the nth last log entry in the screen reader log.
   * @param n the number of the log entry, starting with 1 for the last item.
   */
  this.nthLastLogEntry = function(n) {
    var screenReaderLog = $('#reader_log');
    var lastParagraph = screenReaderLog.element(by.css('p:nth-last-child('+n+')'));
    return lastParagraph.getAttribute('textContent');
  };


  /**
   *  Returns the model data object for the given element.
   * @param elem the field element
   */
  this.getModel = function(elem) {
    return elem.getAttribute('id').then(function(id) {
      return browser.driver.executeScript(
        'return $("#'+id+'").isolateScope().modelData');
    });
  }


  /**
   *  Outputs the browser's console messages.
   */
  this.printBrowserConsole = function() {
    browser.manage().logs().get('browser').then(function(browserLogs) {
      if (browserLogs.length > 0) {
        console.log("Messages from browser's console");
        browserLogs.forEach(function(log){
          console.log(log.message);
        });
        console.log("End of messages from browser's console");
      }
    });
  }


  /**
   *  Sends key events to a field.
   * @param field the field to which the characters should be send
   * @param text the text whose characters should be sent
   */
  this.sendKeys = function(field, text) {
    // For some reason, on RHEL 7 in Chrome, if you focus a field and then send
    // key events withouht sleeping a bit between the two, the autocompleter's
    // getUpdates function does not get called before the field value is updated
    // with the last character.  The problem can also be solved by increasing
    // the autocompleter options.frequency setting, but it only happens when
    // testing, so I don't want to make that slower.
    browser.sleep(100);
    // Some key events are lost?  Send them one at a time.
    for (var i=0, len=text.length; i<len; ++i) {
      field.sendKeys(text[i]);
      browser.sleep(10);
    }
  }


  /**
   *  Sets the window height so that it is just large enough to show the given
   *  element.
   * @param elemID the ID of the element
   * @return a promise for when the size has been set
   */
  this.setWindowHeightForElement = (elemID) => {
    // As of 2018/5/8 (or earlier) the setSize function no longer shrinks the
    // window height in Chrome, though it does still affect the width.
    // An issue was filed at:  https://github.com/angular/protractor/issues/4798
    // Rather than wait for a fix, we are switching to using a new function,
    // "putFieldAtBottomOfWindow".
    return browser.driver.executeScript('return jQuery("#'+elemID+'").offset().top'
      ).then(function(top) {
        // The returned offset top value is not completely right, it seems,
        // so I am adding adding extra height pixels in the setSize call below.
        return browser.manage().window().setSize(1100, top+110);
      });
  };


  /**
   *  Puts the given element's bottom edge at the bottom of the window.
   *  Assumption:  The window is taller than the element (typically a field).
   * @param elemID the ID of the element (field) to be moved to the bottom
   */
  this.putElementAtBottomOfWindow = (elemID) => {
    // Add a div to the top of the page whose height is just bit enough to
    // push the element below the bottom, and then scroll it into view.
    return browser.driver.executeScript(
     `var elem = jQuery("#"+arguments[0]);
      var elemTop = elem.offset().top;
      var winHeight = window.innerHeight;
      if (winHeight > elemTop) {
        var div = document.getElementById('scrollTestDiv');
        if (!div) {
          div = $('<div style="background-color: green" id=scrollTestDiv></div>')[0];
          document.body.insertBefore(div, document.body.firstChild);
        }
        div.style.height = (winHeight-elemTop)+'px';
        div.style.width = '100px'; // to make it visible
      }
      elem[0].scrollIntoView(false);`, elemID);
  };
};

module.exports = {BasePage: BasePage};
