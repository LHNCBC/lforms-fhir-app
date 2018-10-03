// This file defines the "search" (AJAX) autocompleter.

// These autocompleters are based on the Autocompleter.Base class defined
// in the Script.aculo.us controls.js file.

(function($, jQuery, Def) {
  "use strict";

  var Class = Def.PrototypeAPI.Class;

  /**
   *  An autocompleter that retrieves list options via AJAX calls.
   */
  Def.Autocompleter.Search = Class.create();

  // This is the definition for the Search class methods.  We define it in
  // a temporary object to help NetBeans see it.
  var ctmp = {
    /**
     *  A cache for search result objects.  The key is the search
     *  autocompleter's base URL, and the value is a cache for queries sent to
     *  that URL.  (In a repeating line table, the cache gets shared across rows.)
     */
    urlToCache_: {},

    /**
     *  The index into the resultCache_ (an instance variable) for the part
     *  of the cache used to store autocompletion results (which are generally
     *  fewer than the search results, which can be up to 500.)
     */
    RESULT_CACHE_AUTOCOMP_RESULTS: 1,

    /**
     *  The index into the resultCache_ (an instance variable) for the part
     *  of the cache used to store search results (which generally have many
     *  more returned hits than the autcompletions results.)
     */
    RESULT_CACHE_SEARCH_RESULTS: 0,

    /**
     *  The maximum number of characters in the field for which we will send
     *  an autocompletion request.  If the field value is longer than this,
     *  we will truncate it when sending the request.
     */
    MAX_VALUE_SIZE_FOR_AUTOCOMP: 25,

    /**
     *  The constructor function.
     */
    constructor: Def.Autocompleter.Search,

    /**
     * The superclass.
     */
    superclass: Def.Autocompleter.Base.prototype
  };
  jQuery.extend(Def.Autocompleter.Search, ctmp);
  ctmp = null;

  jQuery.extend(Def.Autocompleter.Search.prototype,
    Def.Autocompleter.Base.prototype);
  Def.Autocompleter.Search.prototype.className = 'Def.Autocompleter.Search' ;

  // This is the definition for the Search instance methods.  We define it in
  // a temporary object to help NetBeans see it.
  var tmp = {
    /**
     *  The pending Ajax request (if any).
     */
    lastAjaxRequest_: null,

    /**
     *  A reference to the search result cache for this autocompleter.  The
     *  results cache is an array of two hashes, where the index is the value of
     *  the "autocomp" parameter in the AJAX request, i.e, the 0th hash is
     *  the hash for the non-autocomp request (e.g. control+return to see
     *  an expanded results list) and the hash at index 1 is the hash for
     *  autocompletion results.  Each hash is a hash from the search string
     *  the autocompletion results for the string 'pro'.)
     */
    resultCache_: null,

    /**
     *  Whether we are using search result caches in this autocompleter.
     *  It might not be a good idea for all fields, but for now the default
     *  is to use it.
     */
    useResultCache_: true,

    /**
     *  The data for the suggestion list that appears when the user leaves a
     *  non-matching field value in a field for which matching values are not
     *  required.  (This could also be used for suggestions when a matching value
     *  is required, but we would need to change the message the user sees to
     *  handle that case.)
     */
    suggestionList_: null,


    /**
     *  The constructor.  (See Prototype's Class.create method.)
     * @param field the ID or the DOM element of the field for which the
     *  list is displayed.  If an element is provided, it must contain an ID
     *  attribute, or one will be assigned.
     * @param url for getting the completion list.  The website answering the
     *  URL is expected to understand the following parameters:
     *  <ul>
     *    <li>terms - the text from the field.  This should be used to find
     *     matching list items.</li>
     *    <li>maxList - if present, this signifies that this is a request
     *     for a large list of search results (e.g. by using the "see more" link
     *     on the list).  If maxList is not present, that means this is an autocompletion
     *     request and the server should return a short list (e.g. 7 items) as
     *     quickly as possible.</li>
     *    <li>authenticity_token - (optional) This is an anti-CSRF parameter.
     *     If the page has a value in window._token, it will get sent in this
     *     parameter.</li>
     *    <li>suggest - (optional) User input that does not match a list value
     *     will trigger a request for suggestions that are close to what the
     *     user typed.  A "suggest" parameter value of "1" means the request
     *     is for suggestions.</li>
     *    <li>field_val - When "suggest"==1, this contains the value the user
     *     typed.</li>
     *  </ul>
     *  The URL's response should be an array.  For a non-suggestion request
     *  (suggest != '1'), it should have the following elements:
     *  <ul>
     *    <li>position 0 - the total search result count (including the ones not
     *     returned, if autocomp==1).</li>
     *    <li>position 1 - the list of codes for the list items (if the items are
     *     coded)</li>
     *    <li>position 2 - A hash of extra data about the list items (e.g.
     *     an extra set of codes), or null if there is none.
     *     The keys in the hash should be names for the
     *     data elements, and the values should be an array of values, one for
     *     each returned item.  Configuration for what gets returned here is out
     *     of scope of this class; this search autocompleter just sends the
     *     parameters above.  The extra data for the selected item (when the
     *     user makes a selection) can get be retrieved with
     *     getItemExtraData(itemText).</li>
     *    <li>position 3 - the list item data; each item is an array of display
     *     string fields which will be joined together.  (At a mimimum, each item
     *     should be an array of one string.)  These display strings can contain
     *     span tags for styling sub-strings (e.g. matches to the user's input)
     *     but other HTML tags will be escaped.</li>
     *    <li>position 4 - if present, this is an array of code system names
     *     identifying the code system for each of the codes in the code array in
     *     position 1.  This is useful for lists that contain entries from
     *     different code systems.</li>
     *  </ul>
     *  For a "suggest" request, the response should have the following elements:
     *  <ul>
     *    <li>position 0 - the list of codes for the suggested items (if the
     *     items have codes)</li>
     *    <li>position 1 - the list of display strings (an array of strings, not
     *     of arrays) for the suggested items.</li>
     *    <li>position 2 - A hash of extra data about the list items (the same
     *     as position 2 for the non-suggestion request above.)
     *    <li>position 3 - if present, this is an array of code system names
     *     identifying the code system for each of the codes in the code array in
     *     position 0.  This is useful for lists that contain entries from
     *     different code systems.</li>
     *  </ul>
     * @param options A hash of optional parameters.  The allowed keys and their
     *  values are:
     *  <ul>
     *    <li>matchListValue - Whether the field value is required to be one from
     *     the list (default: false).  When this field is false, for a
     *     non-matching value a dialog will be shown with a list of suggestions
     *     that are on the list.</li>
     *    <li>sort - Whether or not values should be sorted after being
     *     retrieved from the server.  (Default: true).  Note that if you do not
     *     want sorting, you might also want set the suggestionMode parameter to
     *     Def.Autocompleter.NO_COMPLETION_SUGGESTIONS so that a suggestion is
     *     not moved to the top of the list.</li>
     *    <li>suggestionMode - an integer specifying what type of suggestion
     *     should be offered based on what the user has typed.  For values, see
     *     defAutocompleterBaseInit in autoCompBase.js.
     *    <li>useResultCache - (default: true) Whether or not the results
     *     should be cached.  The same cache is used for all fields that share
     *     the same url parameter value.</li>
     *    <li>maxSelect - (default 1) The maximum number of items that can be
     *     selected.  Use '*' for unlimited.</li>
     *    <li>minChars - (default 1) The minimum number of characters that must
     *     be in the field before autocompletion will start.</li>
     *    <li>scrolledContainer - the element that should be scrolled to bring
     *     the list into view if it would otherwise extend below the edge of the
     *     window. The default is document.documentElement (i.e. the whole
     *     window).  This may be null if no scrolling is desired (e.g. if the
     *     list field is in a fixed position on the window), but in that
     *     case the list element might be unusually short.
     *     Note:  At present the only tested cases of this parameter are the
     *     default value and null.</li>
     *    <li>nonMatchSuggestions - (default: false) Whether the user should be
     *     given a list of suggestions if they enter a non-matching value.
     *     This only applies when matchListValue is false.</li>
     *    <li>headerBar - If the page has a fixed-position element at the top of
     *     the page (e.g. a top navigation bar), the autocompleter needs to know
     *     that so that when scrolling to show the list it doesn't scroll the current
     *     field under the header bar.  This is the element ID for such a header
     *     bar.</li>
     *    <li>tableFormat - If true, then if the list's items contain
     *     multiple fields, the list will be formatted in a table instead of just
     *     concatenating the fields together for each list item.</li>
     *    <li>valueCols - Used when tableFormat is true to indicate
     *     which columns in the table should be combined to form the field value
     *     when the row is selected.  This should be an array of column indices
     *     (starting with 0).  If absent, all columns will be combined for the
     *     value.  Note that the specification here must result in unique field
     *     values for each table row.</li>
     *    <li>colHeaders - Used when tableFormat is true, this is an array of
     *     column headers for the columns in the table.  If this is not supplied, no header
     *     row will be created.</li>
     *    <ul>Somewhat obsolete, but not yet deprecated, parameters:
     *      <li>buttonID - the ID of the button (if there is one) which activates
     *       a search.  If you use this option, do not set matchListValue.</li>
     *      <li>autocomp - a boolean that controls whether the field should
     *       also autocomplete as the user types.  When this is false, the user
     *       won't see an autocompletion list until they hit return.  (Default:  true)</li>
     *      <li>dataRequester - A RecordDataRequester for getting additional data
     *       after the user makes a selection from the completion list.  This may be
     *       null, in which case no request for additional data is made.</li>
     *    </ul>
     *  </ul>
     */
    initialize: function(fieldID, url, options) {

      options = jQuery.extend({
        partialChars: 2,
        onHide: jQuery.proxy(function(element, update) {
          $('searchCount').style.display = 'none';
          $('moreResults').style.display = 'none';
          Def.Autocompleter.Base.prototype.hideList.apply(this);
        }, this),

        onShow: jQuery.proxy(function(element, update) {
          // Make the search count display before adjusting the list position.
          $('searchCount').style.display='block';
          $('moreResults').style.display = 'block';

          Def.Autocompleter.Base.prototype.showList.apply(this);
        }, this),

        onComplete: jQuery.proxy(this.onComplete, this)
      }, options || {});

      if (!Def.Autocompleter.Base.classInit_)
        Def.Autocompleter.Base.classInit();

      this.url = url;

      this.defAutocompleterBaseInit(fieldID, options);

      this.autocomp = options['autocomp'];
      if (this.autocomp === undefined)
        this.autocomp = true;  // default
      else if (!this.autocomp) {
        // Disable autocompletion by setting it to run once every year.
        // Note:  This used to be 1000 years, but the Linux version of Firefox
        // was treating such a large timeout value as zero.
        this.options.frequency = 365 * 86400; // seconds
      }

      if (options.sort === undefined)
        options.sort = true; // default

      if (options['useResultCache']!==null && options['useResultCache']===false)
        this.useResultCache_ = false; // default is true-- see declaration

      // Do not use the synchronous request option.  On Windows and Firefox,
      // if you use synchronous, and hit control+enter to run a search, the
      // Firefox Downloads window opens.  I don't know why.  See my post
      // (Paul Lynch) to the Prototype & Scriptaculous Google group, dated
      // 2008/2/5 for a test case.
      // Also, the Prototype library recommends not to use synchronous requests.
      //   this.options.asynchronous = false;

      // Set up event observers.
      jQuery(this.element).focus(jQuery.proxy(this.onFocus, this));
      // The base class sets up one for a "blur" event.

      var buttonID = options['buttonID'];
      this.buttonID = buttonID;
      // buttonID might be "null", see line 3 of _search_field_autocomp.rhtml.
      if (buttonID && buttonID !== 'null') {
        // We need to use mousedown for the button.  We cannot wait for a
        // mouseup or click event because we have no idea how long that might
        // take, and we need to handle the blur event (which could be the result
        // or a click or of something else.)  Handling the mousedown event
        // also has the nice side-effect of preventing the blur from ever
        // occuring -- though I don't understand why.  (If I comment out the
        // Ajax.Request, the blur event occurs, but if I uncomment that and
        // comment out the onComplete code, it does not.)
        var button = jQuery(document.getElementById(buttonID));
        button.mousedown(jQuery.proxy(this.buttonClick, this));
        button.keypress(jQuery.proxy(this.buttonKeyPress, this));
      }
      jQuery(this.element).addClass('search_field');

      if (options.colHeaders) {
        this.colHeaderHTML = '<table><thead><th>'+
          options.colHeaders.join('</th><th>') + '</th></thead><tbody>';
      }
    },


    /**
     *  Initializes the itemToDataIndex_ map.
     */
    initItemToDataIndex: function() {
      // For the search list, itemToDataIndex_ gets populated when we get an
      // autocompletion list.  However, it needs to have a non-null value for
      // cases where lookups are done for non-matching field values which did
      // not bring back any list (or single-character values when did not
      // trigger an autocompletion event).
      this.itemToDataIndex_ = {};
    },


    /**
     *  A copy constructor, for a new field (e.g. another field in a new row
     *  of a table).
     * @param fieldID the ID of the field being assigned to the new autocompleter
     *  this method creates.
     * @return a new autocompleter for field field ID
     */
    dupForField: function(fieldID) {
      var dataReq = this.dupDataReqForField(fieldID);
      var opts = Object.clone(this.constructorOpts_);
      opts['dataRequester'] = dataReq;
      return new Def.Autocompleter.Search(fieldID, this.url, opts);
    },


    /**
     *  Returns the field value (or partial value, if the tokens option was
     *  specified) with any field separator strings replaced by
     *  spaces, so it is ready to use as a search string.
     * @param fieldVal (optional) the field value if already obtained from this.element
     */
    getSearchStr: function(fieldVal) {
      // Use a cached version of the regular expression so we don't need to
      // create one for every autocompletion request.
      var ac = Def.Autocompleter;
      if (!ac.LIST_ITEM_FIELD_SEP_REGEX)
        ac.LIST_ITEM_FIELD_SEP_REGEX = new RegExp(ac.LIST_ITEM_FIELD_SEP, 'g');
      if (!fieldVal)
        fieldVal = this.getToken();
      return fieldVal.replace(ac.LIST_ITEM_FIELD_SEP_REGEX, ' ').trimLeft();
    },


    /**
     *  Runs the search (asynchronously).  This gets called when the search
     *  button is clicked.  When the search completes, onComplete
     *  will be called to update the choice list.
     */
    runSearch: function() {
      // Cancel the previous search/AJAX request, if there is one pending.
      // This might free up a thread for the browser, but it does not help
      // the server any.
      if (this.lastAjaxRequest_ && this.lastAjaxRequest_.transport)
        this.lastAjaxRequest_.abort();

      this.searchInProgress = true;
      this.searchStartTime = new Date().getTime();

      // See if the search has been run before.
      var searchStr = this.getSearchStr();
      var results = null;
      if (this.useResultCache_) {
        results = this.getCachedResults(searchStr,
                            Def.Autocompleter.Search.RESULT_CACHE_SEARCH_RESULTS);
        if (results)
          this.onComplete(results, null, true);
      }
      if (!results) { // i.e. if it wasn't cached
        // Run the search
        var paramData = {
          authenticity_token: window._token || '',
          maxList: null, // no value
          terms: searchStr
        }
        var options = {
          data: paramData,
          complete: this.options.onComplete
        }
        this.changed = false;
        this.hasFocus = true;
        this.lastAjaxRequest_ = jQuery.ajax(this.url, options);
        this.lastAjaxRequest_.requestParamData_ = paramData;
      }
    },


    /**
     *  Initializes this.resultCache_.
     */
    initResultCache: function() {
      this.resultCache_ = Def.Autocompleter.Search.urlToCache_[this.url];
      if (!this.resultCache_) {
        this.resultCache_ = [{}, {}];
        Def.Autocompleter.Search.urlToCache_[this.url] = this.resultCache_;
      }
    },


    /**
     *  Returns the cached search results (in the form of an AJAX response object
     *  for a request initiated by runSearch or getUpdatedChoices)
     *  for the given search string, or null if there are no cached results.
     * @param str the search string
     * @param autocomp RESULT_CACHE_AUTOCOMP_RESULTS if the results were for an
     *  autocompletion request (as opposed to a search request, which returns a
     *  much longer list of results), and RESULT_CACHE_SEARCH_RESULTS if they were
     *  for a search request.
     */
    getCachedResults: function(str, autocomp) {
      if (!this.resultCache_)
        this.initResultCache();
      return this.resultCache_[autocomp][str];
    },


    /**
     *  Stores search results for the given search string, for later re-use
     *  via getCachedResults.
     * @param str the search string
     * @param autocomp RESULT_CACHE_AUTOCOMP_RESULTS if the results were for an
     *  autocompletion request (as opposed to a search request, which returns a
     *  much longer list of results), and RESULT_CACHE_SEARCH_RESULTS if they were
     *  for a search request.
     * @param results the AJAX response object for a search initiated by
     *  runSearch or getUpdatedChoices.
     */
    storeCachedResults: function(str, autocomp, results) {
      if (!this.resultCache_)
        this.initResultCache();
      this.resultCache_[autocomp][str] = results;
    },


    /**
     *  Forgets previously cached results.
     */
    clearCachedResults: function() {
      this.resultCache_ = [{}, {}];
      Def.Autocompleter.Search.urlToCache_[this.url] = this.resultCache_;
    },


    /**
     *  Changes the autocompleter's URL to the given URL, and updates the cache.
     * @param url The new url for getting the completion list.  See the "url"
     *  parameter in the constructor.
     */
    setURL: function(url) {
      this.url = url;
      this.initResultCache();
    },


    /**
     *  Returns true if the given key event (from the input field) is a request
     *  for showing the expanded list.
     * @param event the key event
     */
    fieldEventIsBigList: function(event) {
       return event.keyCode===jQuery.ui.keyCode.ENTER && (event.ctrlKey ||
           (!this.autocomp &&
            this.domCache.get('elemVal') !== this.processedFieldVal_ &&
            this.domCache.get('elemVal').trim() !== ''));
    },


    /**
     *  This gets called when the user presses a key on the search button.
     * @param event the key event
     */
    buttonKeyPress: function(event) {
      if (event.keyCode === jQuery.ui.keyCode.ENTER) {
        this.runSearch();
      }
    },


    /**
     *  Processes a returned set of choices in preparation for building
     *  the HTML for the update (choices) area.  This filters out selected
     *  items, sorts the items, and picks the default item.
     * @param fieldValToItemFields a hash from field value version of the list
     *  items to the list item arrays received from the AJAX call
     * @return an array of two elements, an array of field value strings from
     *  fieldValToItemFields ordered in the way the items should appear in the
     *  list, and a boolean indicating whether the
     *  topmost item is placed as a suggested item.
     */
    processChoices: function(fieldValToItemFields) {
      // Filter out already selected items for multi-select lists
      var filteredItems = [];
      var fieldVals = Object.keys(fieldValToItemFields);
      for (var i=0, len=fieldVals.length; i<len; ++i) {
        var item = fieldVals[i];
        if (!this.multiSelect_ || !this.isSelected(item))
          filteredItems.push(item);
      }

      if (filteredItems.length > 0 && !this.numHeadings_) {
        // Sort items, but first see if there is a best match we want to move to
        // the top.
        var useStats = this.suggestionMode_ === Def.Autocompleter.USE_STATISTICS;
        var topItem = null;
        var topItemIndex = -1;
        if (useStats) {
          // For this kind of suggestion mode, we want to rely on the statistical
          // ordering of results returned by the server, which provides the
          // statistically best option at the top, so we work to keep this
          // item at the top of the list when sorting.
          topItemIndex = 0;
        }
        else if (this.suggestionMode_ === Def.Autocompleter.SUGGEST_SHORTEST) {
          topItemIndex = this.pickBestMatch(filteredItems);
        }

        if (this.options.sort) {
          if (topItemIndex > -1) {
            topItem = filteredItems[topItemIndex];
            // Set the top item to '', so it will sort to the top of the list.
            // That way, after the sort, we don't have to push it into the top
            // of the list.  (It should be faster this way.)
            filteredItems[topItemIndex] = '';
          }
          filteredItems = filteredItems.sort(Def.Autocompleter.Base.noCaseSort);
          if (topItemIndex > -1)
            filteredItems[0] = topItem;
        }
        else if (topItemIndex > 0) { // no sorting, but still want suggestion at top
          var temp = filteredItems[0];
          filteredItems[0] = filteredItems[topItemIndex];
          filteredItems[topItemIndex] = temp;
        }
      }
      return [filteredItems, topItemIndex > -1];
    },


    /**
     *  HTML-escapes a string of text for display in a search list.
     *  Allows <span> tags to pass through.
     * @param text the string to escape
     * @return the escaped string
     */
    escapeHTML: function(text) {
      var f = Def.Autocompleter.Base.escapeAttribute(text);
      // Allow (unescape) span tags to mark matches.
      return f.replace(/&lt;(\/)?span&gt;/g, '<$1span>');
    },


    /**
     *  Builds and returns the HTML for the selection area.
     * @param listFieldVals the array of field values for the items to be shown in the list.
     * @param bestMatchFound whether a best match was found as a recommenation
     * @param fieldValToItemFields a hash from field value version of the list
     *  items to the list item arrays received from the AJAX call
     */
    buildUpdateHTML: function(listFieldVals, bestMatchFound, fieldValToItemFields) {
      var rtn, htmlStart, htmlEnd, rowStartOpen, rowStartClose, fieldSep, rowEnd;
      var tableFormat = this.options.tableFormat;
      if (tableFormat) {
        htmlStart = this.colHeaderHTML || '<table><tbody>';
        htmlEnd = '</tbody></table>';
        rowStartOpen = '<tr';
        rowStartClose = '><td>';
        fieldSep = '</td><td>';
        rowEnd = '</td></tr>';
      }
      else {
        htmlStart = '<ul>';
        htmlEnd = '</ul>'
        rowStartOpen = '<li';
        rowStartClose = '>';
        fieldSep = Def.Autocompleter.LIST_ITEM_FIELD_SEP;
        rowEnd = '</li>';
      }

      rtn = htmlStart;
      for (var i=0, len=listFieldVals.length; i<len; ++i) {
        var itemText = listFieldVals[i];
        var itemFields = fieldValToItemFields[itemText];
        var escapedFields = [];
        for (var c=0, flen=itemFields.length; c<flen; ++c)
          escapedFields[c] = this.escapeHTML(itemFields[c]);
        rtn += rowStartOpen;
        if (i===0 && bestMatchFound)
          rtn += ' class="suggestion"';
        if (tableFormat)
          rtn += ' data-fieldval="' + this.escapeHTML(itemText) + '"';
        rtn += rowStartClose;
        rtn += escapedFields.join(fieldSep)
        rtn += rowEnd;
      }
      rtn += htmlEnd;
      return rtn;
    },


    /**
     *  Updates the contents of the search count div below the list, if
     *  there were any results.
     * @param totalCount the total hits found on the server (possibly more than
     *  returned.)
     * @param shownCount the number of hits to be shown in the list
     * @param responseLength the number of characters in the returned data
     */
    setSearchCountDiv: function(totalCount, shownCount, responseLength) {
      var searchCountElem = $('searchCount');
      var searchCountStr = '';
      if (totalCount > 0) {
        searchCountStr = shownCount + ' of ' + totalCount + ' total';

        // Dan Clark of Freedom Scientific reported that the search count made
        // the output for JAWS too verbose, so I am commenting out this call.
        // this.readSearchCount();

        // Now display the counts and the elapsed time
        var timestamp = new Date();
        // In computing the elapsed time, add the delay from the last keystroke,
        // so the user gets the total time from that point.
        var elapsedTime = timestamp.getTime() - this.searchStartTime +
          this.options.frequency*1000 + '';

        // bytes count of the total response data
        var bytes = responseLength + '';
        // Add some padding so the string stays roughly the same size
        if (bytes.length < 3)
          bytes += '&nbsp;';

        var resultInfo = '; ' + bytes + ' bytes in ' + elapsedTime + ' ms';
        if (elapsedTime.length < 3)
          resultInfo += '&nbsp;';

        searchCountStr += resultInfo;
        searchCountElem.innerHTML = searchCountStr;
      }
    },


    /**
     *  Returns a hash from the values that get placed into the form field when
     *  an item is selected to the array of item field values shown in the
     *  autocompletion list.  While doing this it also initializes
     *  itemToDataIndex_.
     * @param itemFieldArrays the array of item field arrays (one array per
     *  item
     */
    createFieldVals: function(itemFieldArrays) {
      var rtn = {};
      var valCols = this.options.valueCols;
      var joinSep = Def.Autocompleter.LIST_ITEM_FIELD_SEP;
      this.itemToDataIndex_ = {};
      if (valCols)
        var numValCols = valCols.length;
      for (var i=0, len=itemFieldArrays.length; i<len; ++i) {
        var itemFields = itemFieldArrays[i];
        var selectedFields;
        if (valCols) {
          selectedFields = [];
          for (var c=0; c<numValCols; ++c)
            selectedFields[c] = itemFields[valCols[c]];
        }
        else
          selectedFields = itemFields;
        var fieldVal = selectedFields.join(joinSep);
        // Remove any <span> tags added for highlighting
        fieldVal = fieldVal.replace(/<\/?span>/g, '');
        this.itemToDataIndex_[fieldVal] = i;
        rtn[fieldVal] = itemFields;
      }
      return rtn;
    },


    /**
     *  This gets called when an Ajax request returns.  (See Prototype's
     *  Ajax.Request and callback sections.)
     * @param xhrObj A jQuery-extended XMLHttpRequest object
     * @param textStatus A jQuery text version of the status of the request
     *  (e.g. "success")
     * @param fromCache whether "response" is from the cache (optional).
     */
    onComplete: function(xhrObj, textStatus, fromCache) {
      var untrimmedFieldVal = this.getToken();
      this.trimmedElemVal = untrimmedFieldVal.trim(); // used in autoCompBase
      if (this.lastAjaxRequest_ === xhrObj) {
        this.lastAjaxRequest_ = null;
      }
      if (xhrObj.status === 200) { // 200 is the "OK" status
        var reqParams = xhrObj.requestParamData_;
        var searchStr = reqParams['terms'];
        var autocomp = reqParams['maxList'] === undefined;
        var searchAC = Def.Autocompleter.Search;

        if (!fromCache && this.useResultCache_) {
          var resultCacheIndex = autocomp ?
            searchAC.RESULT_CACHE_AUTOCOMP_RESULTS :
            searchAC.RESULT_CACHE_SEARCH_RESULTS;
          this.storeCachedResults(searchStr, resultCacheIndex, xhrObj);
        }

        // The search string is a truncated version of the field value for
        // autocompletion requests.  Compute what the search string would be
        // if it were sent for the current field value.
        var searchStrForFieldVal = this.getSearchStr(untrimmedFieldVal);
        if (autocomp) {
          searchStrForFieldVal =
            searchStrForFieldVal.substr(0, searchAC.MAX_VALUE_SIZE_FOR_AUTOCOMP);
        }

        // If the user is not in the field, don't try to display the returned
        // results.   (Note:  Refocusing does not work well, because it
        // confuses the field validation code which happens on change.)
        // Also, if this response is not for the text that is currently in the
        // field, don't do anything with it.
        if ((this.hasFocus || this.refocusInProgress_) &&
            searchStrForFieldVal === searchStr) {

          // Retrieve the response data, which is in JSON format.
          var responseData = xhrObj.responseJSON || JSON.parse(xhrObj.responseText);

          var totalCount = responseData[0];
          this.itemCodes_ = responseData[1];
          this.listExtraData_ = responseData[2];
          this.itemCodeSystems_ = responseData[4];
          this.rawList_ = responseData[3]; // rawList_ is used in list selection events
          var fieldValToItemFields = this.createFieldVals(this.rawList_);
          var data = this.processChoices(fieldValToItemFields);
          var listFieldVals=data[0], bestMatchFound=data[1];
          var listHTML = this.buildUpdateHTML(listFieldVals, bestMatchFound,
            fieldValToItemFields);
          this.updateChoices(listHTML, false);

          var shownCount = listFieldVals.length;
          this.setSearchCountDiv(totalCount, shownCount,
            xhrObj.responseText.length);

          // Show "see more" link depending on whether this was an autocompletion
          // event and whether there are more items to see.
          if (shownCount < totalCount && autocomp)
            $('moreResults').style.display ='block';
          else {
            $('moreResults').style.display ='none';
          }

          this.searchInProgress = false;

          // If the number of list items is too large, use the split area, otherwise
          // put the list below the field.
          this.listBelowField_ = this.entryCount <=
            Def.Autocompleter.Base.MAX_ITEMS_BELOW_FIELD;

          // Now position the answer list.  We would like to do that before, so we
          // could include the position time in the above time measurement, but the
          // time and byte count string can affect the position.
          this.posAnsList();
        }
      }
    },


    /**
     *  Returns a hash of extra data (returned with AJAX autocompletion request)
     *  for a selected list item.
     *  Currently, this assumes that itemText was present in the last list shown
     *  for this field; if subsequent autocompletion requests take place in
     *  which itemText is not present, the return value will be empty.
     * @param itemText the display string of the selected item.
     */
    getItemExtraData: function(itemText) {
      var itemData = {};
      if (this.listExtraData_) {
        var dataIndex = this.itemToDataIndex_[itemText];
        if (dataIndex != null) {  // if it is on the list
          var keys = Object.keys(this.listExtraData_);
          for (var k=0, numKeys = keys.length; k<numKeys; ++k) {
            var key = keys[k];
            itemData[key] = this.listExtraData_[key][dataIndex];
          }
        }
      }
      return itemData;
    },


    /**
     *  Returns a hash of all data about the item whose value is currently in the
     *  field, unless itemText is provided, in which case it will return data
     *  for that item.  This should only be used just after a selection has been made.
     * @param itemText (optional) the display text of an list item.  If the text
     *  is not in the list, then the returned hash will only contain the "text"
     *  property.
     *
     * @return a hash with "code" and "text" properties for the selected item,
     *  and if there is any extra data for the item, that will be under a
     *  "data" sub-hash.  If the items came with code system data, there will
     *  also be a "code_system" property with the code system corresponding to
     *  "code".  Properties for which there are no values will not be present,
     *  except for the "text" property.
     */
    getItemData: function(itemText) {
      if (!itemText)
        itemText = this.domCache.get('elemVal');
      var rtn = {text: itemText};
      if (itemText != '' && this.itemToDataIndex_) {
        var code = this.getItemCode(itemText);
        if (code !== undefined && code !== null) {
          rtn.code = code;
          if (this.itemCodeSystems_) {
            var itemIndex = this.itemToDataIndex_[itemText];
            var codeSys = this.itemCodeSystems_[itemIndex];
            if (codeSys)
              rtn.code_system = codeSys;
          }
        }
        var data = this.getItemExtraData(itemText);
        if (Object.keys(data).length > 0)
          rtn.data = data;
      }
      return rtn;
    },


    /**
     *  This gets called to show the list.
     */
    show: function() {
      // The base class' show only calls onShow if the "update" element
      // has "display: none" set.  Since we are hiding the list container
      // instead, we need to explicitly call onShow here.
      // Only do this if the list is not already being shown.  For some reason,
      // in addition to checking whether the list container's visibility style is
      // "hidden", we also need to check for no value, because (at least in
      // Firefox) it doesn't have a value initially.
      if (this.listContainer.style.visibility === 'hidden'
          || this.listContainer.style.visibility === '') {
        this.options.onShow(this.element, this.update);
      }
    },


    /**
     *  This to hide the list. (e.g. after a selection).
     */
    hide: function() {
      if (!this.searchInProgress) {
        Def.Autocompleter.Search.superclass.hide.apply(this);
      }
    },


    /**
     *  Handles the click on the search button.
     * @param event the event object
     */
    buttonClick: function(event) {
      // If there is a timeout from a key event, clear it.  (The user might have
      // hit one character, and then hit the search button, and if we don't clear
      // it, the timeout will hide the list because the input length is less
      // than the minimum number of characters.
      if (this.observer)
        clearTimeout(this.observer);

      // This runs on mouse down, and we stop the event so the focus never
      // leaves the field.
      this.searchInProgress = true;

      this.runSearch();
      Def.Autocompleter.stopEvent(event);
    },


    /**
     *  This gets called when the "See more items" link is clicked.
     * @param event the click event on the link
     */
    handleSeeMoreItems: function(event) {
      // For multiselect lists, after selecting an item the field is empty, so
      // if we have a preFieldFillVal_, we reset the field value back to that
      // before running the search.  At present, the only case where we don't
      // have preFieldFillVal_ is when the user has clicked on a list item,
      // after which (kind of by accident) the "see more items" link is hidden,
      // so we don't need to worry about that case for now.
      if (this.multiSelect_ && this.domCache.get('elemVal')==='' &&
          this.preFieldFillVal_) {
        this.setFieldVal(this.preFieldFillVal_, false);
      }
      this.buttonClick(event);
    },


    /**
     *  A method that gets called when the field gains the focus.
     */
    onFocus: function() {
      // Ignore blur events on the completionOptionsScroller.
      if (Def.Autocompleter.completionOptionsScrollerClicked_ === true) {
        Def.Autocompleter.completionOptionsScrollerClicked_ = false;
      }
      else {
        if (!this.refocusInProgress_) {
          Def.Autocompleter.screenReaderLog('Type to show matching list values.');
          // Hide the list, which might be showing from another autocompleter.
          // (On blur events, autocompleters set a timeout for hiding the list
          // so click events will work, but if the autocompleter isn't the current
          // one when the timeout runs, it doesn't know whether it should really
          // hide the list, so it doesn't.)
          this.hide();

          // Reset rawList_, which might have data from a prior use of the field,
          // and which is used by attemptSelection for list selection observers.
          this.rawList_ = [];
        }

        // The base onFocus resets refocusInProgress_, so we call it after the above
        // check.
        Def.Autocompleter.Base.prototype.onFocus.apply(this);
        this.hasFocus = true;
      }
    },


    /**
     *  This gets called when the field loses focus.
     * @param event the DOM event object
     */
    onBlur: function(event) {
      // Do nothing if we're refocusing the field.
      if (!this.refocusInProgress_ && !Def.Autocompleter.completionOptionsScrollerClicked_) {
        Def.Autocompleter.Base.prototype.onBlur.apply(this, [event]);
        if (!this.searchInProgress) {
          this.active = false;
        }
      }
    },


    /**
     *  Overrides the method in the Scriptaculous superclass to change the
     *  parameters that are posted.
     */
    getUpdatedChoices: function() {
      if (this.lastAjaxRequest_ && this.lastAjaxRequest_.transport)
        this.lastAjaxRequest_.abort();

      this.searchStartTime = new Date().getTime() ;

      var results = null;
      var autocompSearch =  Def.Autocompleter.Search;
      var fieldVal = this.getSearchStr();
      // Truncate fieldVal to some maximum length so we limit the number of
      // autocompletion requests that get generated if a user sets a book on the
      // keyboard.
      if (fieldVal.length > autocompSearch.MAX_VALUE_SIZE_FOR_AUTOCOMP)
        fieldVal = fieldVal.substr(0, autocompSearch.MAX_VALUE_SIZE_FOR_AUTOCOMP);

      if (this.useResultCache_) {
        // See if the search has been run before.
        results = this.getCachedResults(fieldVal,
                                    autocompSearch.RESULT_CACHE_AUTOCOMP_RESULTS);
        if (results)
          this.onComplete(results, null, true);
      }
      if (!results) {
        // Run the search
        var paramData = {
          authenticity_token: window._token || '',
          terms: fieldVal,
        };
        var options = {
          data: paramData,
          dataType: 'json',
          complete: this.options.onComplete
        }
        this.lastAjaxRequest_ = jQuery.ajax(this.url, options);
        this.lastAjaxRequest_.requestParamData_ = paramData;
      }
    },


    /**
     *  Starts an AJAX call to find suggestions for a field value that does
     *  not match the list.
     */
    findSuggestions: function() {
      var fieldVal = this.getSearchStr();
      var paramData = {
        authenticity_token: window._token || '',
        field_val: fieldVal,
        suggest: 1
      };
      var options = {
        data: paramData,
        complete: jQuery.proxy(this.onFindSuggestionComplete, this)
      };
      var suggestionDialog = Def.Autocompleter.SuggestionDialog.getSuggestionDialog();
      suggestionDialog.resetDialog();
      suggestionDialog.show();
      $('suggestionFieldVal').innerHTML =
        Def.PrototypeAPI.escapeHTML(fieldVal);

      jQuery.ajax(this.url, options);
    },


    /**
     *  Handles the return of the AJAX call started in findSuggestions.
     *  (See Prototype's Ajax.Request and callback sections for a description
     *  of the parameter and how this works.)
     * @param response the jQuery-extended XMLHttpRequest object
     */
    onFindSuggestionComplete: function(response) {
      if (response.status === 200) { // 200 is the "OK" status
        // Retrieve the response data, which is in JSON format.
        var responseData = response.responseJSON || JSON.parse(response.responseText);
        var codes = responseData[0];
        var eventData = [];
        var suggestionDialog = Def.Autocompleter.SuggestionDialog.getSuggestionDialog();
        suggestionDialog.prepareSuggestionDialogForList(this.element);
        var foundMatch = false;
        if (codes.length > 0) {
          // Put up a dialog box with the suggestions, unless one of the
          // suggestions matches what was typed (in which case we just accept
          // that item as the selection).
          var listItems = responseData[1];
          this.suggestionList_ = responseData;
          var lowerCaseFieldVal =
            this.domCache.get('elemVal').trim().toLowerCase();
          var fieldSep = Def.Autocompleter.LIST_ITEM_FIELD_SEP;
          for (var i=0, max=listItems.length; !foundMatch && i<max; ++i) {
            // The suggestion comes as an array (for the different fields that
            // might be displayed).  Fix that, and store it in hopes of
            // helping acceptSuggstion.
            listItems[i] = listItems[i].join(fieldSep);
            if (listItems[i].toLowerCase() === lowerCaseFieldVal) {
              foundMatch = true;
              suggestionDialog.hide();
              if (this.observer)
                clearTimeout(this.observer); // stop the autocompletion
              this.acceptSuggestion(i);
            }
          }
          if (!foundMatch) {
            eventData = listItems;
            suggestionDialog.showSuggestions(listItems, this.element);
          }
        }
        else {
          suggestionDialog.showNotFoundMsg(this.element);
        }
        // Do not notify if we found a match and are not actually showing
        // the suggestion dialog message.
        if (!foundMatch) {
          Def.Autocompleter.Event.notifyObservers(this.element, 'SUGGESTIONS',
            {suggestion_list: eventData});
        }
      }
    },


    /**
     *  Handles the user's request to accept a suggestion as a replacement for
     *  the field value.
     * @param index the index (in the suggestionList_ codes and values)
     *  of the suggestion that was accepted.
     */
    acceptSuggestion: function(index) {
      // We stored the last suggestion list data in suggestionList_.  Look
      // for "code".
      var codes = this.suggestionList_[0];
      var listItems = this.suggestionList_[1];
      var usedSuggestion = listItems[index];
      var valTyped = this.domCache.get('elemVal');
      var newVal = listItems[index];
      this.setFieldVal(this.processedFieldVal_ = usedSuggestion, false);
      // Mark the field as having a valid value, and reset processedFieldVal_.
      this.setMatchStatusIndicator(true);
      this.fieldValIsListVal_ = true;

      this.propagateFieldChanges();

      Def.Autocompleter.Event.notifyObservers(this.element, 'SUGGESTION_USED',
                                          {suggestion_used: usedSuggestion});
      // Also send a list selection notification (so that that event can be
      // used as a change event for the field).  Also, the suggestion was from
      // the list.
      this.itemCodes_ = codes; // used by listSelectionNotification
      this.itemToDataIndex_ = {};
      this.itemToDataIndex_[listItems[index]] = index;
      this.listExtraData_ = this.suggestionList_[2];
      this.itemCodeSystems_ = this.suggestionList_[3];
      this.listSelectionNotification(valTyped, true); // not typed, on list

      // No field is focused at the moment (because of the dialog).
      // Put the focus back into the field we just updated.
      this.element.focus();
    }
  };
  jQuery.extend(Def.Autocompleter.Search.prototype, tmp);
  tmp = null;
})(Def.PrototypeAPI.$, jQuery, Def);
