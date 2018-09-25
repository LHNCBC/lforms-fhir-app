// These autocompleters are based on the Autocompleter.Base class defined
// in the Script.aculo.us controls.js file.   Most of the controls.js code has
// been overridden, and the part that hasn't has been included in this file.
//
// See http://script.aculo.us/ for Scriptaculous, whose license is the following
// MIT-style license:
//
// Copyright © 2005-2008 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// “Software”), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


if (typeof Def === 'undefined')
  window.Def = {};


// Wrap the definitions in a function to protect our version of global variables
(function($, jQuery, Def) {
  "use strict";

  // A test for IE, borrowed from PrototypeJS -- and modified.
  var Browser = Def.PrototypeAPI.Browser;
  var isIE = !!window.attachEvent && !Browser.isOpera || navigator.userAgent.indexOf('Trident') >= 0;

  Def.Autocompleter = { // Namespace for DEF autocompletion stuff
    // Variables related to autocompleters but independent of any particular
    // autocompleter go here.

    /**
     *  True if the browser is IE.
     */
    isIE: isIE,

    /**
     *  A variable to keep track of which autocomplete text field is using the
     *  shared autocompletion area.
     */
    currentAutoCompField_: -1,

    /**
     *  The suggestion mode constant that means rely on the statistics for
     *  the field's master table.  See the suggestionMode option in
     *  defAutocompleterBaseInit.
     */
    USE_STATISTICS: 2,

    /**
     *  The suggestion mode constant that means do not recommend one item from
     *  the returned list over the others.  See the suggestionMode option in
     *  defAutocompleterBaseInit.
     */
    NO_COMPLETION_SUGGESTIONS: 0,

    /**
     *  The suggestion mode constant that means the shortest match should
     *  recommended over other returned items.  See the suggestionMode option in
     *  defAutocompleterBaseInit.
     */
    SUGGEST_SHORTEST: 1,

    /**
     *  If the list items consist of multiple
     *  strings (fields) each, this is the string used to join together each list
     *  item's fields to produce the list item string the user sees in the list.
     */
    LIST_ITEM_FIELD_SEP: ' - ',

    /**
     *  The screen reader log used by the autocompleter.
     */
    screenReaderLog_: new Def.ScreenReaderLog(),


    /**
     *  Sets global options for customizing behavior of all autocompleters.
     *  Currently, what is supported is the overriding (or supplying) of the
     *  functions found in this object.
     * @param options - a hash from one or more of this object's function names
     *  to a replacement function.
     */
    setOptions: function(options) {
      jQuery.extend(this, options);
    },


    /**
     *  Returns value of the given form field element.  (This may be overridden for
     *  special handling of values.)
     * @param field the form field from which the value is needed.
     */
    getFieldVal: function(field) {
      return field.value;
    },


    /**
     *  Sets the given form element's value to the given value. (This may be
     *  overridden for special handling of values.)
     * @param field the DOM field element.
     * @param val the new value, which should only be a string.
     * @param runChangeEventObservers (default true) whether the change
     *  event observers for the field (which includes the update for the data
     *  model and the running of rules) should be run after the value is set.
     */
    setFieldVal: function(field, val, runChangeEventObservers) {
      if (field.autocomp)
        field.autocomp.setFieldVal(val, runChangeEventObservers);
      else {
        if (typeof runChangeEventObservers === 'undefined')
          runChangeEventObservers = true; // default
        var fieldVal;
        if (runChangeEventObservers)
          fieldVal = this.getFieldVal(field);
        field.value = val;
        if (runChangeEventObservers && fieldVal !== val) {
          Def.Event.simulate(field, 'change');
        }
      }
    },


    /**
     *  Returns the field lookup key for the given field.  Lookup keys are used
     *  to store information about a particular field (or maybe a column of
     *  identical fields) and are also used to store/retrieve the associated
     *  fields themselves.  In systems where every field is unique, this can
     *  be the field's name or ID attribute, but it can also be a key shared by fields
     *  that have the same supporting list.  If this is overridden, be sure to
     *  also override lookupFields.
     * @param field a DOM field element
     */
    getFieldLookupKey: Def.Observable.lookupKey, // default implementation


    /**
     *  Returns the fields matching the given lookup key.  (See getFieldLookupKey).
     *  If there is no match, an empty array will be returned.
     *  This should be overridden to match getFieldLookupKey if that is overridden.
     * @param lookupKey a key for finding matching elements.
     */
    lookupFields: function(lookupKey) {
      var rtn = [];
      for (var i=0, numForms=document.forms.length; i<numForms; ++i) {
        var match = document.forms[i].elements[lookupKey];
        if (match !== undefined)
          rtn.push(match);
      }
      return rtn;
    },


    /**
     *  Returns the fields matching otherFieldLookupKey (see getFieldLookupKey)
     *  which are associated in some way with "field".  This default implementation
     *  just returns all the fields matching otherFieldLookupKey.
     * @param field the field for which related fields are needed
     * @param otherFieldLookupKey the key for finding fields related to "field".
     *  (See getFieldLookupKey.)
     * @returns an array of matching fields.  The array will be empty if there
     *  are no matching fields.
     */
    findRelatedFields: function(field, otherFieldLookupKey) {
      return this.lookupFields(otherFieldLookupKey);
    },


    /**
     *  Returns the label text of the field with the given ID, or null if there
     *  isn't a label.  This default implementation just returns null.
     * @param fieldID the ID of the field for which the label is needed.
     */
    getFieldLabel: function(fieldID) {
      return null;
    },


    /**
     *  Returns the DOM node immediately containing the list item elements.  This
     *  could either be a tbody or a ul, depending on options.tableFormat.
     *  If there is no list, the return value may be null.
     */
    listItemElementContainer: function() {
      var rtn = jQuery("#completionOptions")[0].firstChild;
      if (rtn && rtn.tagName === "TABLE")
        rtn = rtn.tBodies[0]; // tbody
      return rtn;
    },


    /**
     *  Returns the list items elements, which will be either
     *  tr elements or li elements depending on options.tableFormat.
     *  If there is no list, the return value may be null.
     */
    listItemElements: function() {
      var rtn = null;
      var itemContainer = this.listItemElementContainer();
      if (itemContainer)
        rtn = itemContainer.childNodes;
      return rtn;
    },


    /**
     *  Sets off an alarm when a field is in an invalid state.
     * @param field the field that is invalid
     */
    setOffAlarm: function(field) {
       Def.FieldAlarms.setOffAlarm(field);
    },


    /**
     *  Cancels the alarm started by setOffAlarm.
     */
    cancelAlarm: function(field) {
       Def.FieldAlarms.cancelAlarm(field);
    },


    /**
     *  Stops further event handlers from runing on the element and prevents the
     *  default action.
     * @param event a jQuery Event object
     */
    stopEvent: function(event) {
      event.stopImmediatePropagation();
      event.preventDefault();
    },


    /**
     *  Logs a message for a screen reader to read.  By default, this
     *  uses an instance of Def.ScreenReaderLog.
     * @param msg the message to log
     */
    screenReaderLog: function(msg) {
      Def.Autocompleter.screenReaderLog_.add(msg);
    },


    /**
     *  Creates a cache for storing DOM values.
     * @param directProps a hash of properties that should be directly defined
     *  on the hash.  These properties should not include "data", "get",
     *  "invalidate", or "refresh".
     * @param jitProps a hash of properties to functions that will be called
     *  (just in time) to initialize the properties.  These properties will be
     *  accessible via the "get" function on the cache, and can be cleared with
     *  the "invalidate" function.
     * @return the cache object
     */
    createDOMCache: function(directProps, jitProps) {
      var rtn = {
        data: {},
        get: function(item) {
          var rtn = this.data[item]
          if (rtn === undefined)
            rtn = this.data[item] = this.refresh[item].apply(this);
          return rtn;
        },
        set: function(item, value) {
          this.data[item] = value;
        },
        // Drops the current value for "item"
        invalidate: function(item) {
          if (item)
            delete this.data[item];
          else
            this.data = {};
        },
        // A hash of functions to get a new property value
        refresh: { // populated with jitProps
        }
      };

      Object.assign(rtn, directProps);
      Object.assign(rtn.refresh, jitProps);
      return rtn;
    }

  };


  /**
   *  A base class for our Ajax and local autocompleters.
   */
  Def.Autocompleter.Base = function() {}; // Base class object


  /**
   *  Class-level stuff for Def.Autocompleter.Base.
   */
  jQuery.extend(Def.Autocompleter.Base, {

    /**
     *  The maximum number of items to show below a field if the user has not
     *  used the "see more" feature.
     */
    MAX_ITEMS_BELOW_FIELD: 7,

    /**
     *  Whether classInit() has been called.
     */
    classInit_:  false,

    /**
     *  Does one-time initialization needed by all autocompleters on the page.
     */
    classInit: function() {
      if (!this.classInit_) {
        jQuery(document.body).append(
           '<div id="searchResults" class="form_auto_complete"> \
           <div id="completionOptionsScroller">\
           <span class="auto_complete" id="completionOptions"></span> \
           </div> \
           <div id="moreResults">See more items (Ctl Ret)</div> \
           <div id="searchCount">Search Results<!-- place holder for result count, \
            needed for height calculation--></div> \
           <div id="searchHint">Search Hint<!--place holder--></div> \
           </div>');

        jQuery('#moreResults').mousedown(function(event) {
          var field = $(Def.Autocompleter.currentAutoCompField_);
          field.autocomp.handleSeeMoreItems(event);
          Def.Autocompleter.Event.notifyObservers(field, 'LIST_EXP',
          {list_expansion_method: 'clicked'});
        });

        jQuery('#completionOptionsScroller').mousedown(jQuery.proxy(function(event) {
          // Here is a work-around for an IE-only issue in which if you use the scrollbar
          // on the list, the field gets a blur event (and maybe a change event
          // as well.)  For IE, we set things to refocus the field and to ignore
          // the change, blur, and focus events.
          if (Def.Autocompleter.isIE && event.target.id === 'completionOptionsScroller') {
            Def.Autocompleter.stopEvent(event);
            Def.Autocompleter.completionOptionsScrollerClicked_ = true;
            if ($(Def.Autocompleter.currentAutoCompField_) != -1) {
              var field = $(Def.Autocompleter.currentAutoCompField_);
              setTimeout(function(){field.focus()});
            }
          }
        }, this));
        this.classInit_ = true;
      }
    },


    /**
     * Provides a way to do a case-insensitive sort on a javascript array.
     * Simply specify this function as the parameter to the sort function,
     * as in myArray.sort(noCaseSort)
     */
    noCaseSort: function(a, b) {
      var al = a.toLowerCase() ;
      var bl = b.toLowerCase() ;
      if (al > bl) return 1 ;
      else if (al < bl) return -1 ;
      else return 0 ;
    },


    /**
     *  Escapes a string for safe use as an HTML attribute.
     * @param val the string to be escaped
     * @return the escaped version of val
     */
    escapeAttribute: Def.PrototypeAPI.escapeAttribute,


    /**
     *  Reverses escapeAttribute.
     * @param escapedVal the string to be unescaped
     * @return the unescaped version of escapedVal
     */
    unescapeAttribute: function(escapedVal) {
      return escapedVal.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
  });


  /**
   *  A cache of DOM values shared by all autocompleters on the page.
   */
  Def.Autocompleter.sharedDOMCache = Def.Autocompleter.createDOMCache({}, {
    spacerDiv: function() {
      var spacerDiv = $('spacer');
      if (!spacerDiv) {
        spacerDiv = document.createElement('div');
        spacerDiv.setAttribute('id', 'spacer');
        document.body.appendChild(spacerDiv);
      }
      return spacerDiv;
    },
    listContainer: function() {return $('searchResults')},
    firstEntryWidth: function() {
      return Def.Autocompleter.listItemElements()[0].offsetWidth;
    },
    listBoundingRect: function() {
      return this.get('listContainer').getBoundingClientRect();
    },
    viewPortWidth: function() {
      return document.documentElement.clientWidth;
    },
    spacerCoords: function() {
      return this.get('spacerDiv').getBoundingClientRect();
    }
  });



  // This is the definition for the Base instance methods.  We define it in
  // a temporary object to help NetBeans see it.
  var tmp = {
    /**
     *  The array of options passed to the constructor.
     */
    constructorOpts_: null,

    /**
     *  The HTML DOM input element holding the score field for this list.
     */
    scoreField_: null,

    /**
     *  Whether scoreField_ has been initialized.
     */
    scoreFieldInitialized_: false,

    /**
     *  A hash between list values and the original unsorted list index,
     *  so that we can match up list values with arrays for codes and other
     *  data.
     */
    itemToDataIndex_: null,

    /**
     *  The codes of the currently selected items, stored as values on a hash,
     *  where the keys are the display strings.
     */
    selectedCodes_: null,

    /**
     *  The currently selected items' display strings, stored as keys on a hash.
     *  Some might not have codes, and so there might be more entries here than in
     *  selectedCodes_.
     */
    selectedItems_: null,

    /**
     *  The currently selected items' completed data, as an array of hashes for
     *  each item.
     */
    selectedItemData_: null,

    /**
     *  Whether the field value is required to be one from the list.
     */
    matchListValue_: null,

    /**
     *  Whether the field is invalid.
     */
    invalidStatus_: false,

    /**
     *  Whether the current field's value matches (even partially) one or more of
     *  the items in the list.  If the user types the first few leters of an
     *  item, it's matchStatus_ is true, even though the field value does
     *  not equal a complete list item value.
     */
    matchStatus_: true,

    /**
     *  Whether the field is responding to a focus event.
     */
    focusInProgress_: false,

    /**
     *  Whether the field is losing focus but will be refocused after a short
     *  delay.
     */
    refocusInProgress_: false,

    /**
     *  Whether or not the list will be shown below the field.
     */
    listBelowField_: true,

    /**
     *  The element that holds the selection list and search hit count
     *  information.
     */
    listContainer: null,

    /**
     *  A RecordDataRequester instance that will get used after list entry
     *  selection to pull back additional data.
     */
    recDataRequester_: null,

    /**
     *  Whether the autocompleter is enabled.  For example, this is false when
     *  there is no list assigned to the field.
     */
    enabled_: true,

    /**
     *  The value of the list's field before it was filled in by changing the
     *  default list selection (e.g. by arrowing into the list).
     */
    preFieldFillVal_: null,

    /**
     *  This is true when the field value is a list value.  This is initially null,
     *  which means we do not know anything about the current field value.  (A value
     *  of false means we know it is not a list value.)
     */
    fieldValIsListVal_: null,

    /**
     *  A hash from item indexes to heading levels, for the full list.
     *  A level of 0 means the item is not a heading, level 1 means the item is a top-level
     *  heading, and level 2 means a sub-heading.
     */
    indexToHeadingLevel_: {},

    /**
     *  An integer specifying what type of suggestion should
     *  be offered based on what the user has typed.  For allowed values,
     *  see the suggestionMode option in defAutocompleterBaseInit.
     */
    suggestionMode_: Def.Autocompleter.SUGGEST_SHORTEST,

    /**
     *  A reference to the last scroll effect (used in positioning).
     */
    lastScrollEffect_: null,

    /**
     *  Whether or not multiple items can be selected from the list.
     */
    multiSelect_: false,

    /**
     *  The hash of "extra data" for the current list.  (This might only apply
     *  to search lists.)
     */
    listExtraData_: null,

    /**
     *  The last value we tried to handle as a data entry, valid or not.
     */
    processedFieldVal_: null,


    /**
     *  An initialization method for the base Def.Autocompleter class.
     * @param field the ID or the DOM element of the field for which the
     *  list is displayed.  If an element is provided, it must contain an ID
     *  attribute, or one will be assigned.
     * @param options A hash of optional parameters.  For the allowed keys see the
     *  subclasses.  The base class uses the following keys:
     *  <ul>
     *    <li>matchListValue - whether the field should validate its value
     *      against the list (default: false)</li>
     *    <li>dataRequester - A DataRecordRequester for getting additional data
     *     after the user makes a selection from the completion list.  This may be
     *     null, in which case no request for additional data is made.</li>
     *    <li>suggestionMode - an integer specifying what type of suggestion
     *     should be offered based on what the user has typed.  If this is not
     *     specified, the default is [Def.Autocompleter.]SUGGEST_SHORTEST, which
     *     means "pick the shortest match."  A value of
     *     NO_COMPLETION_SUGGESTIONS means no suggestions, and a value of
     *     USE_STATISTICS means that the suggestion is based on statistics, and
     *     that we will rely on the server to return the best item as the first
     *     item in the list.</li>
     *    <li>maxSelect - (default 1) The maximum number of items that can be
     *     selected.  Use '*' for unlimited.</li>
     *    <li>wordBoundaryChars - (default none) For autocompleting based on part of the
     *     field's value, this should be an array of the characters that are
     *     considered "word" boundaries (e.g. a space, but could be something
     *     else).  When this option is used, maxSelect is ignored.
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
     *     This only applies when matchListValue is false.  Also, the option is
     *     only presently supported by search autocompleters.</li>
     *    <li>headerBar - If the page has a fixed-position element at the top of
     *     the page (e.g. a top navigation bar), the autocompleter needs to know
     *     that so that when scrolling to show the list it doesn't scroll the current
     *     field under the header bar.  This is the element ID for such a header
     *     bar.</li>
     *    <li>twoColumnFlow - (default: true) Whether to allow long lists to
     *     flow into two columns to show more of the list on the page.</li>
     *  </ul>
     */
    defAutocompleterBaseInit: function(field, options) {
      if (!options)
        options = {};

      // Rename the wordBoundaryChars option back to "tokens", the original
      // name from Scriptaculous, which seemed to confuse tokens with token
      // delimiters.  Also allow the older "tokens" option name to be used
      // for backward compatibility.
      if (options.wordBoundaryChars)
        options.tokens = options.wordBoundaryChars;

      if (options['suggestionMode'] !== undefined)
        this.suggestionMode_ = options['suggestionMode'];

      this.twoColumnFlow_ = options.twoColumnFlow;
      if (this.twoColumnFlow_ === undefined)
        this.twoColumnFlow_ = true;

      if (options.tokens || options.maxSelect === undefined)
        options.maxSelect = 1;
      else if (options.maxSelect === '*')
        options.maxSelect = Infinity;
      this.multiSelect_ = options.maxSelect !== 1;
      if (options.scrolledContainer !== undefined) // allow null
        this.scrolledContainer_ = options.scrolledContainer;
      else
        this.scrolledContainer_ = document.documentElement;
      if ((this.nonMatchSuggestions_ = options['nonMatchSuggestions']) === undefined)
        this.nonMatchSuggestions_ = false; // default
      this.constructorOpts_ = options;

      this.selectedCodes_ = {};
      this.selectedItems_ = {};
      this.selectedItemData_ = [];

      var dataRequester = options.dataRequester;

      if (!Def.Autocompleter.Base.classInit_)
        Def.Autocompleter.Base.classInit();

      this.matchListValue_ = options['matchListValue'] || false;

      this.recDataRequester_ = dataRequester;
      this.update      = $('completionOptions');
      this.options = options;
      this.options.frequency    = this.options.frequency || 0.01;
      this.options.minChars     = this.options.minChars || 1;

      this.element     = typeof field === 'string' ? $(field) : field;
      this.ensureNeededAttrs();

      // --- start of section copied from controls.js baseInitialize ---
      this.hasFocus    = false;
      this.changed     = false;
      this.active      = false;
      this.index       = 0;
      this.entryCount  = 0;
      this.observer = null;
      this.element.setAttribute('autocomplete','off');
      // --- end of section copied from controls.js baseInitialize ---
      jQuery(this.update).hide();
      var jqElem = jQuery(this.element);
      jqElem.blur(jQuery.proxy(this.onBlur, this));
      jqElem.keydown(jQuery.proxy(this.onKeyPress, this));

      // On clicks, reset the token bounds relative to the point of the click
      if (this.options.tokens) {
        jqElem.click(function () {
          this.tokenBounds = null;
          this.getTokenBounds(this.element.selectionStart);
        }.bind(this));
      }

      // If this is a multiselect list, put the field into a span.
      if (options.maxSelect > 1) {
        var fieldDiv = jQuery('<span class="autocomp_selected"><ul></ul></span>')[0];
        var fieldParent = this.element.parentNode;
        fieldParent.replaceChild(fieldDiv, this.element);
        fieldDiv.appendChild(this.element);
        this.selectedList = fieldDiv.firstChild;
      }

      // ARIA markup for screen readers
      // See http://test.cita.illinois.edu/aria/combobox/combobox2.php
      // for an example that works with JAWS + Firefox.  (It behaves
      // like a regular combobox, according to a JAWS user.)
      this.element.setAttribute('role', 'combobox');
      // For aria-expanded, I am following the example at:
      // http://www.w3.org/TR/wai-aria/roles#combobox
      this.element.setAttribute('aria-expanded', 'false');

      // Set up event handler functions.
      this.onMouseDownListener = jQuery.proxy(this.onMouseDown, this);
      jQuery(this.element).change(jQuery.proxy(this.onChange, this));
      jQuery(this.element).keypress(jQuery.proxy(this.changeToFieldByKeys, this));
      var fieldChanged =
        jQuery.proxy(function() {this.typedSinceLastFocus_ = true;}, this);
      jQuery(this.element).bind('paste cut', fieldChanged);

      // Store a reference to the element that should be positioned in order
      // to align the list with the field.
      this.listContainer = Def.Autocompleter.sharedDOMCache.get('listContainer');

      // Make the this.showList and this.hideList available to onShow and onHide
      this.options.showList = jQuery.proxy(this.showList, this);
      this.options.hideList = jQuery.proxy(this.hideList, this);
      this.options.posAnsList = jQuery.proxy(this.posAnsList, this);

      // Undo the base class' hiding of the update element.  (We're hiding
      // the listContainer instead.)
      this.update.style.display="block";

      // Store a reference to the autocompleter in the field object, for
      // ease of accessing the autocompleter given the field.
      this.element.autocomp = this;

      // Set the active list item index to -1, instead of 0 as in controls.js,
      // because there might not be any list items.
      this.index = -1;

      this.initDOMCache();
      this.oldElementValue = this.domCache.get('elemVal');
    },


    /**
     *  Sets the autocompleter's form element's value to the given value.
     *  Differs from Def.Autocompleter.setFieldVal in that it uses and manages
     *  the domCache values.
     * @param val the new value, which should only be a string.
     * @param runChangeEventObservers (default true) whether the change
     *  event observers for the field (which includes the update for the data
     *  model and the running of rules) should be run after the value is set.
     */
    setFieldVal: function(val, runChangeEventObservers) {
      if (typeof runChangeEventObservers === 'undefined')
        runChangeEventObservers = true; // default
      var fieldVal;
      if (runChangeEventObservers)
        fieldVal = this.domCache.get('elemVal');
      this.domCache.set('elemVal', this.element.value = this.oldElementValue = val);
      this.tokenBounds = null;
      if (runChangeEventObservers && fieldVal !== val) {
        Def.Event.simulate(this.element, 'change');
      }
    },


    /**
     *  Ensures there is an ID on the list's element, creating one if necessary.
     */
    ensureNeededAttrs: function () {
      // The autocompleter uses the ID attribute of the element. If pElem
      // does not have an ID, give it one.
      var pElem = this.element;
      if (pElem.id === '') {
        // In this case just make up an ID.
        if (!Def.Autocompleter.lastGeneratedID_)
          Def.Autocompleter.lastGeneratedID_ = 0;
        pElem.id = 'ac' + ++Def.Autocompleter.lastGeneratedID_;
      }
    },


    /**
     *  Used by the dupForField methods (defined in the subclasses) to
     *  duplicate the RecordDataRequester.
     * @param fieldID the ID of the field being assigned to the new RecordDataRequester
     *  this method creates.
     * @return the RecordDataRequester for the new autocompleter being
     *  constructed.  (The return value will be null if this autocompleter
     *  doesn't have a RecordDataRequester.)
     */
    dupDataReqForField: function(fieldID) {
      var dataReq = null;
      if (this.recDataRequester_)
        dataReq = this.recDataRequester_.dupForField(fieldID);
      return dataReq;
    },


    /**
     *  Returns the codes for the currently selected items or an empty array if there are none.
     *  If some of the selected items do not have a code, there will be null in
     *  that place in the returned array.
     */
    getSelectedCodes: function() {
      var keys = this.getSelectedItems();
      var rtn = [];
      for (var i=0, len=keys.length; i<len; ++i) {
        rtn.push(this.selectedCodes_[keys[i]]);
      }
      return rtn;
    },


    /**
     *  Returns the display strings for the currently selected items or an empty array if there are none.
     */
    getSelectedItems: function() {
      return Object.keys(this.selectedItems_);
    },


    /**
     *  Returns all information about the currently selected list items.
     * @return an array of hashes, each with at least a "text" property for the
     *  item's display text.  The hashes may also contain (if the data was
     *  provided) properties "code", "code_system", and "data" (which for search
     *  lists contains the "extra data" fields for that item).  The return value
     *  will be null if there are no selected items.
     */
    getSelectedItemData: function() {
      return this.selectedItemData_.length > 0  ? this.selectedItemData_ : null;
    },


    /**
     *  Adds the code for the current item in the field to the list of selected
     *  codes, and does the same for the item text.  If this is not a multi-select
     *  list, the newly selected code will replace the others.  The text and
     *  code values can be provided to set the currently stored value.  This
     *  does not broadcast any events.
     * @param itemText (optional) if provided, this will be the selected text rather
     *  than the current item in the field.  When this is provided, it is
     *  assumed that "code" is provided too.
     * @param code (optional) if provided, this will be the code for the
     *  selected text rather that then code for the item currently in the field.
     *  If this is provided, itemText must be provided too.
     */
    storeSelectedItem: function(itemText, code) {
      if (itemText === undefined) {
        itemText = this.domCache.get('elemVal');
        code = this.getItemCode(itemText);
      }
      if (!this.multiSelect_) {
        this.selectedCodes_ = {};
        this.selectedItems_ = {};
        this.selectedItemData_ = [];
      }
      if (itemText) {
        var hasCode = code !== null && code !== undefined;
        if (hasCode)
          this.selectedCodes_[itemText] = code;
        this.selectedItems_[itemText] = 1;
        var itemData;
        if (this.getItemData)
          itemData = this.getItemData(itemText);
        else {
          itemData = {text: itemText};
          if (hasCode)
            itemData.code = code;
        }
        this.selectedItemData_.push(itemData);
      }
    },


    /**
     *  Returns the code for the given item text, or null if there isn't one.
     */
    getItemCode: function(itemText) {
      if (!this.itemToDataIndex_)
        this.initItemToDataIndex();
      var dataIndex = this.itemToDataIndex_[itemText];
      var newCode = null;
      if (dataIndex !== undefined && this.itemCodes_)
        newCode = this.itemCodes_[dataIndex];
      return newCode;
    },


    /**
     *  Appends the given string (presumably a list item, but possibly off the
     *  list) to the selected area.  This is only for multi-select lists.  Do
     *  not call it for single-select lists, or you will get an error.
     * @param text the text to be added to the list of selected items.
     * @return an HTML-escaped version of the "text"
     */
    addToSelectedArea:  function(text) {
      var escapedVal = Def.Autocompleter.Base.escapeAttribute(text);
      var li = jQuery('<li><button type="button" alt="'+escapedVal+
                      '"><span aria-hidden="true">&times;</span></button>'
                      +escapedVal+'</li>')[0];
      this.selectedList.appendChild(li);
      var span = li.childNodes[0];
      jQuery(span).click(jQuery.proxy(this.removeSelection, this));
      return escapedVal;
    },


    /**
     *  Moves the current field string to the selected area (for multi-select
     *  lists).  After this, the field will be blank.
     */
    moveEntryToSelectedArea: function() {
      var escapedVal = this.addToSelectedArea(this.domCache.get('elemVal'));
      this.setFieldVal(this.processedFieldVal_ = '', false);
      Def.Autocompleter.screenReaderLog('Selected '+escapedVal);
      if (this.index >= 0) { // i.e. if it is a list item
        // Delete selected item
        var itemContainer = Def.Autocompleter.listItemElementContainer();
        itemContainer.removeChild(this.getCurrentEntry());
        // Having deleted that item, we now need to update the the remaining ones
        --this.entryCount;
        var itemNodes = itemContainer.childNodes;
        for (var i=this.index, len=itemNodes.length; i<len; ++i)
          itemNodes[i].autocompleteIndex = i;
        if (this.index == this.entryCount)
          --this.index;
        if (this.numHeadings_) {
          // Move index forward until there is a non-heading entry.  If there
          // isn't one forward, try backward.
          var startPos = this.index;
          while (this.index < this.entryCount && this.liIsHeading(this.getCurrentEntry()))
            ++this.index;
          if (this.index == this.entryCount) { // no non-heading found
            this.index = startPos - 1;
            while (this.index > 0 && this.liIsHeading(this.getCurrentEntry()))
              --this.index;
          }
        }
        // Mark the new "current" item as selected
        this.render();
      }
      // Make the list "active" again (functional) and reposition
      this.active = true;
      this.hasFocus = true;
      this.posAnsList();
    },


    /**
     *  For a multi-select list, this is an event handler that removes an item
     *  from the selected area.
     * @param event the click event on the item to be removed.
     */
    removeSelection: function(event) {
      var li = event.target.parentNode;
      if (event.target.tagName === 'SPAN') // the span within the button
        li = li.parentNode;
      li.parentNode.removeChild(li);
      var itemText = li.childNodes[1].textContent;
      delete this.selectedCodes_[itemText];
      delete this.selectedItems_[itemText];
      for (var i=0, len=this.selectedItemData_.length; i<len; ++i) {
        if (this.selectedItemData_[i].text === itemText) {
          this.selectedItemData_.splice(i, 1);
          break;
        }
      }
      this.listSelectionNotification(itemText, true, true);
      Def.Autocompleter.screenReaderLog('Unselected '+itemText);
    },


    /**
     *  Returns true if the given text is one of the list items that
     *  has already been selected (for multi-select lists).
     */
    isSelected: function(itemText) {
      return this.selectedItems_ && this.selectedItems_[itemText] !== undefined;
    },


    /**
     *  Returns the score field for this list, or null if there isn't one
     */
    getScoreField: function() {
      if (!this.scoreFieldInitialized_) {
        this.scoreField_ = Def.Autocompleter.getScoreField(this.element);
        if(this.scoreField_)
          this.scoreFieldInitialized_ = true;
      }
      return this.scoreField_;
    },


    /**
     *  Listens to keypress events to determine if the user has typed into
     *  the field.
     * @param evt the key event
     */
    changeToFieldByKeys: function(evt) {
      // Only continue if we haven't already seen such an event.
      if (!this.typedSinceLastFocus_) {
        // Based on code from:
        // http://stackoverflow.com/a/4180715/360782
        var change = false;
        if (typeof evt.which === "undefined") {
          // This is IE, which only fires keypress events for printable keys
          change = true;
        }
        else if (typeof evt.which === "number" && evt.which > 0) {
          // In other browsers except old versions of WebKit, evt.which is
          // only greater than zero if the keypress is a printable key.
          // We need to filter out backspace and ctrl/alt/meta key combinations
          change = !evt.ctrlKey && !evt.metaKey && !evt.altKey && evt.which !== 8;
        }
        this.typedSinceLastFocus_ = change;
      }
    },


    /**
     *  Sets up event listeners for the list elements.
     * @param element a list item DOM element.
     */
    addObservers: function(element) {
      // Listen for mousedown events (which arrive more quickly than
      // click events, presumably because click events probably have
      // to be distinguished from double-clicks.)
      jQuery(element).mousedown(this.onMouseDownListener);
    },


    /**
     *  Returns the value of a list item (minus any sequence number and
     *  separator.)
     * @param itemElem a list item DOM element.
     */
    listItemValue: function(itemElem) {
      var rtn;
      if (this.options.tableFormat)
        rtn = itemElem.getAttribute('data-fieldval');
      else
        rtn = itemElem.textContent; // decodes escaped HTML elements
      return rtn;
    },


    /**
     *  Override the Scriptaculous version so we do *not* call scrollIntoView().
     *  This does not work well on our page, so we have to do the scrolling
     *  ourselves.
     */
    markPrevious: function() {
      if (this.preFieldFillVal_ === null) // save the value in case of ESC
        this.preFieldFillVal_ = this.domCache.get('elemVal');

      // Move the index back and keep doing so until we're not on a heading (unless we
      // get back to where we started).
      var stopIndex = this.index;
      if (stopIndex === -1)
        stopIndex = this.entryCount - 1;
      var highlightedLITag;
      do {
        if (this.index > 0)
          this.index--;
        else
          this.index = this.entryCount-1;
        highlightedLITag = this.getCurrentEntry(); // depends on this.index
        var itemText = (this.listItemValue(highlightedLITag));

        if (this.itemTextIsHeading(itemText)) {
          Def.Autocompleter.screenReaderLog('Above list heading: '+itemText);
          highlightedLITag = null;
        }
      } while (!highlightedLITag && this.index !== stopIndex);

      if (highlightedLITag) {
        this.scrollToShow(highlightedLITag, this.update.parentNode);
        this.updateElementAfterMarking(highlightedLITag);
      }
    },


    /**
     *  Override the Scriptaculous version so we do *not* call scrollIntoView().
     *  This does not work well on our page, so we have to do the scrolling
     *  ourselves.
     */
    markNext: function() {
      if (this.preFieldFillVal_ === null) // save the value in case of ESC
        this.preFieldFillVal_ = this.domCache.get('elemVal');

      // Move the index forward and keep doing so until we're not on a heading (unless we
      // get back to where we started).
      var stopIndex = this.index;
      if (stopIndex === -1)
        stopIndex = this.entryCount - 1;
      var highlightedLITag;
      do {
        if (this.index < this.entryCount-1)
          this.index++;
        else
          this.index = 0;
        highlightedLITag = this.getCurrentEntry(); // depends on this.index
        var itemText = (this.listItemValue(highlightedLITag));

        if (this.itemTextIsHeading(itemText)) {
          Def.Autocompleter.screenReaderLog('Under list heading: '+itemText);
          highlightedLITag = null;
        }
      } while (!highlightedLITag && this.index !== stopIndex);


      if (highlightedLITag) {
        this.scrollToShow(highlightedLITag, this.update.parentNode);
        this.updateElementAfterMarking(highlightedLITag);
      }
    },


    /**
     *  Updates the field after an element has been highlighted in the list
     *  (e.g. via arrow keys).
     * @param listElement the DOM element that has been highlighted
     */
    updateElementAfterMarking: function(listElement) {
      // Also put the value into the field, but don't run the change event yet,
      // because the user has not really selected it.
      var oldTokenBounds = this.tokenBounds;
      this.updateElement(listElement);  // clears this.tokenBounds
      if (this.options.tokens) {
        // Recompute token bounds, because we've inserted a list value
        this.getTokenBounds(oldTokenBounds && oldTokenBounds[0]);
        this.element.setSelectionRange(this.tokenBounds[0], this.tokenBounds[1]);
      }
      else
        this.element.select();
      // At least under some circumstances, JAWS reads the field value (perhaps
      // because of the "select" above).  However, if this is a table-format
      // autocompleter, we need to read the row.
      if (this.options.tableFormat) {
        var logEntry = [];
        var cells = jQuery(listElement).children('td');
        // Only read the row if there is more than one cell, because the screen
        // reader will read what gets put in the field.
        if (cells.length > 1) {
          for (var i=0, len=cells.length; i<len; ++i)
            logEntry.push(cells[i].innerText);
          Def.Autocompleter.screenReaderLog(logEntry.join('; '));
        }
      }
    },


    /**
     *  Hides the list container.
     */
    hideList: function() {
      if (Def.Autocompleter.currentAutoCompField_ === this.element.id) {
        // Check whether the list is hidden.  By default (via CSS) it is hidden,
        // so if style.visibility is blank, it is hidden.
        var hidden = this.listContainer.style.visibility !== 'visible';
        if (!hidden) {
          this.listContainer.style.visibility = 'hidden';
          this.listShowing = false;
          this.listContainer.setAttribute('aria-hidden', 'true');
          this.element.setAttribute('aria-expanded', 'false');
        }
      }
    },


    /**
     *  Shows the list container.
     */
    showList: function() {
      var previouslyHidden = this.listContainer.style.visibility !== 'visible';
      this.listContainer.style.visibility = 'visible';
      this.listShowing = true;
      this.listContainer.setAttribute('aria-hidden', 'false');
      this.element.setAttribute('aria-expanded', 'true');
      if (previouslyHidden && !this.temporaryHide_ && this.entryCount > 0) {
        Def.Autocompleter.screenReaderLog('A list has appeared below the '+
          this.getFieldName()+'.');
        if (this.options.tableFormat && this.options.colHeaders) {
          Def.Autocompleter.screenReaderLog('The column headers on the '+
           'multi-column list are ' + this.options.colHeaders.join('; '));
        }
      }
    },


    /**
     *  Returns a field "name" like 'field "Drug Use Status"' for labeled fields,
     *  or just 'field' if there is no field label.
     */
    getFieldName: function () {
      if (this.fieldName_ === undefined) {
        var fieldLabel = Def.Autocompleter.getFieldLabel(this.element.id);
        this.fieldName_ =
          (fieldLabel === null) ? 'field' : 'field "'+fieldLabel+'"';
      }
      return this.fieldName_;
    },


    /**
     *  Scrolls the given item into view within its container.
     * @param item the item to scroll into view
     * @param container the scrollable container that has the item
     */
    scrollToShow: function(item, container) {
      if (item.offsetTop < container.scrollTop) {
        container.scrollTop = item.offsetTop;
      }
      else {
        var itemHeight = item.clientHeight;
        // Get the height of the container, less border and scroll bar pixels
        var containerHeight = container.clientHeight;
        if (item.offsetTop + itemHeight - container.scrollTop > containerHeight) {
          container.scrollTop = item.offsetTop + itemHeight - containerHeight;
        }
      }
    },


    /**
     *  Pages the choice list (or table) up or down.
     * @param pageUp - true if it should try to page up, or false if it should
     *  try to page down.
     */
    pageOptionsUpOrDown: function(pageUp) {
      // Get the height of the search results, which might be constrained by
      // span tag (id completionOptions).
      var compOpts = jQuery('#completionOptionsScroller')[0];
      var compOptHeight = compOpts.clientHeight; // the inner height, minus border
      var newScrollTop;
      if (pageUp) {
        if (compOpts.scrollTop>0) {
          newScrollTop = compOpts.scrollTop - compOptHeight;
          if (newScrollTop < 0)
            newScrollTop = 0;
          compOpts.scrollTop = newScrollTop;
        }
      }
      else {
        // PAGE DOWN
        var fullListHeight = jQuery('#completionOptions')[0].clientHeight;
        var maxScrollTop = fullListHeight - compOptHeight;
        if (maxScrollTop < 0)
          maxScrollTop = 0;
        if (compOpts.scrollTop < maxScrollTop) {
          newScrollTop = compOpts.scrollTop + compOptHeight;
          if (newScrollTop > maxScrollTop)
            newScrollTop = maxScrollTop;
          compOpts.scrollTop = newScrollTop;
        }
      }
    },


    /**
     *  Returns true if the given key event is a search request.
     */
    isSearchKey: function (event) {
      return event.ctrlKey && event.keyCode === jQuery.ui.keyCode.ENTER;
    },


    /**
     *  Handles key down events in the field (in spite of the name).
     * @param event the event object from the keypress event
     */
    onKeyPress: function(event) {
      // Do nothing if the autocompleter widget is not enabled_.
      if (this.enabled_) {
        // Note:  Normal (i.e. not search or navigation) key strokes are handled
        // by Scriptaculous, which defers processing until a short time later
        // (specified by 'frequency').  This is important, because we are
        // catching a keyDown event, at which time the element's value has not
        // yet been updated.

        var charCode = event.keyCode;
        var keyHandled = true;
        if (this.fieldEventIsBigList(event)) {
          event.stopImmediatePropagation();
          // If the user had arrowed down into the list, reset the field
          // value to what the user actually typed before running the search.
          if (this.preFieldFillVal_)
            this.setFieldVal(this.preFieldFillVal_, false);
          this.handleSeeMoreItems(event); // implemented in sub-classes
          // Currently we don't have separate events for different reasons to
          // show the big list (e.g. search vs. list expansion), so just send
          // the list expansion event.
          Def.Autocompleter.Event.notifyObservers(this.element, 'LIST_EXP',
            {list_expansion_method: 'CtrlRet'});
        }
        else {
          var keys = jQuery.ui.keyCode;
          switch(charCode) {
            case keys.ENTER:
              // Step the event for multiselect lists so the focus stays in the
              // field.  The user might be trying to select more than one item
              // by hitting return more than once.
              if (this.multiSelect_)
                Def.Autocompleter.stopEvent(event);
              this.handleDataEntry(event);
              break;
            case keys.TAB:
              // For a tab, only try to select a value if there is something in
              // the field.  An item might be highlighted from a return-key
              // selection (in a multi-select list), but if the field is empty we
              // will ignore that because the user might just be trying to leave
              // the field.
              if (this.domCache.get('elemVal') !== '')
                this.handleDataEntry(event);
              break;
            case keys.ESCAPE:
              if (this.preFieldFillVal_!==null) {
                // Restore the field value
                this.setFieldVal(this.preFieldFillVal_, false);
                Def.Autocompleter.Event.notifyObservers(this.element, 'CANCEL',
                    {restored_value: this.preFieldFillVal_});
              }
              if (this.active) {
                this.index = -1;
                this.hide();
                this.active = false;
              }
              break;
            default:
              if (this.active) {
                switch(charCode) {
                  case keys.PAGE_UP:
                    this.pageOptionsUpOrDown(true);
                    break;
                  case keys.PAGE_DOWN:
                    this.pageOptionsUpOrDown(false);
                    break;
                  default:
                    if (!event.ctrlKey) {
                      switch(charCode) {
                        case keys.DOWN:
                        case keys.UP:
                          charCode===keys.UP ? this.markPrevious() : this.markNext();
                          this.render();
                          Def.Autocompleter.stopEvent(event);
                          break;
                        case keys.LEFT:
                        case keys.RIGHT:
                          if (this.options.tokens) {
                            this.tokenBounds = null; // selection point may have moved
                            this.getTokenBounds(); // selection point may have moved
                          }
                          if (!event.ctrlKey && this.index>=0 &&
                              jQuery(this.update).hasClass('multi_col')) {
                            this.moveToOtherColumn(event);
                          }
                          break;
                        default:
                          keyHandled = false;
                      }
                    }
                    else
                      keyHandled = false;
                } // switch
              } // if this.active
              else
                keyHandled = false;
          } // switch
        }

        if (!keyHandled) {
          // Ignore events that are only a shift or control key.  If we allow a
          // shift key to get processed (and e.g. show the list) then shift-tab
          // to a previous field can have trouble, because the autocompleter will
          // still be scrolling the page to show the list.
          // charCode being 0 is a case Scriptaculous excluded for WebKit
          // browsers.  (I'm not sure when that happens.)
          // 16 & 17 = shift & control key codes
          // Also ignore control key combination events except for control+v.
          // We also handle control+enter, which is taken care of above (see the
          // call to fieldEventIsBigList).
          if ((!event.ctrlKey || charCode === 86) && // 86 = V (control+v sends V)
              charCode !== 16 && charCode !== 17 && charCode!==0) {
            this.preFieldFillVal_ = null;  // reset on key strokes in field
            this.changed = true;
            this.hasFocus = true;
            this.matchListItemsToField_ = true;

            if (this.observer)
              clearTimeout(this.observer);
            this.observer = setTimeout(jQuery.proxy(this.onObserverEvent, this),
              this.options.frequency*1000);
          }
        }
      }
    },


    /**
     *  Sets the indicator to let the user know the whether the field value
     *  (if present) matches a value in the field's list.
     * @param matchStatus the match status.  This should be true if the field
     *  value either matches a list item or is blank, and false otherwise.
     */
    setMatchStatusIndicator: function(matchStatus) {
      if (matchStatus !== this.matchStatus_) {
        if (matchStatus) {
          if (jQuery(this.element).hasClass('no_match')) {
            jQuery(this.element).removeClass('no_match');
            Def.Autocompleter.screenReaderLog(
              'The field no longer contains a non-matching value.');
          }
        }
        else {
          jQuery(this.element).addClass('no_match');
          Def.Autocompleter.screenReaderLog(
            'The field\'s value does not match any items in the list.');
        }
        this.matchStatus_ = matchStatus;
      }
    },


    /**
     *  Sets the indicator that marks a field as having an invalid value.  If
     *  the "invalid" parameter is set to false, the visual and permanent
     *  indicator an invalid value will be removed, but if animation and sound
     *  was in progress, that will run until completion.  (To interrupt that,
     *  use cancelInvalidValIndicator).
     * @param invalid true if the field is invalid.  (This is the reverse of
     *  the parameter to setMatchStatusIndicator, mostly because of the names
     *  of the two methods.)
     */
    setInvalidValIndicator: function(invalid) {
      if (invalid) {
        Def.Autocompleter.setOffAlarm(this.element);
        if (!this.invalidStatus_){
          jQuery(this.element).addClass('invalid');
          this.element.setAttribute('invalid', true);
        }
      }
      else {
        if (this.invalidStatus_){
          jQuery(this.element).removeClass('invalid');
          this.element.setAttribute('invalid', false);
        }
      }
      this.invalidStatus_ = invalid;
    },


    /**
     *  Halts any animation and sound associated with the invalid field value
     *  indicator.  This does not clear the permanent visual indicator.  To clear
     *  that, use setInvalidValIndicator(false).
     */
    cancelInvalidValIndicator: function() {
      Def.Autocompleter.cancelAlarm(this.element);
    },


    /**
     *  This is called to update the completion list area with new search results.
     *  We override this to change the default selection.
     * @param choices the HTML for a ul list.  It should not contain whitespace
     *  text between tags.
     * @param pickedByNum whether the user is picking by number
     */
    updateChoices: function(choices, pickedByNum) {
      // We no longer call controls.js' updateChoices because the autocompleteIndex
      // settings need to be made after we move the default selection.  However,
      // a good bit of this code is copied from there.
      this.index = -1;
      if (!this.changed && this.hasFocus) {
        this.update.innerHTML = choices;
        // If the HTML has a header row, disable clicks on that row
        var fc = this.update.firstChild;
        if (fc && fc.tHead) {
          jQuery(fc.tHead).mousedown(function (e) {
            Def.Autocompleter.stopEvent(e)});
        }

        var domItems = Def.Autocompleter.listItemElements();

        if (domItems) {
          this.entryCount = domItems.length;
          var i;
          if (this.suggestionMode_ !== Def.Autocompleter.NO_COMPLETION_SUGGESTIONS) {
            if (this.entryCount > 0 && !this.focusInProgress_ && pickedByNum) {
              // Use the first non-heading entry (whose number should match
              // what was typed) as the default
              for(i=0; this.liIsHeading(domItems[i]) && i<this.entryCount; ++i);
              this.index = i;
            }
          } // If we are making a suggestion

          for (i=0; i < this.entryCount; i++) {
            var entry = this.getEntry(i);
            entry.autocompleteIndex = i;
            this.addObservers(entry);
          }
        } else {
          this.entryCount = 0;
        }

        if(this.entryCount===1 && this.options.autoSelect) {
          this.selectEntry();
          this.hide();
        } else {
          this.render();
        }

        // don't change the match indicator on a focus event.  (Prefetch
        // autocompleters show the whole list, no matter what is in the field.)
        if (!this.focusInProgress_) {
          // The field is in a non-matching state if the value is not empty
          // and there are no items in the list.
          this.setMatchStatusIndicator(this.entryCount > 0 || this.trimmedElemVal==='');
        }
      }
    },


    /**
     *  Returns true if the user seems to be picking a list item by number.
     */
    pickedByNumber: function() {
      return this.add_seqnum && this.trimmedElemVal.match(/^\d+$/);
    },


    /**
     *  Returns the index of the item in the given list
     *  which should be offered as best match.
     * @param listItems an array of the items in the list
     * @return the index of the item, or -1 if no item should be highlighted.
     */
    pickBestMatch: function(listItems) {
      // If there is something in the field, pick:
      // 1) the shortest choice with the field value at the beginning, or
      // 2) the shortest choice with the field value somewhere, or
      // 3) the shortest choice
      var elemValue = this.trimmedElemVal.toLowerCase();
      var numItems = listItems.length;
      var rtn = -1;

      if (elemValue.length > 0 && numItems > 0) {
        var minLengthIndex = -1;
        var minLength = Infinity;
        var beginMatchMinLengthIndex = -1;
        var beginMatchMinLength = minLength;
        var innerMatchMinLengthIndex = -1;
        var innerMatchMinLength = minLength;

        for (var i=0; i<numItems; ++i) {
          // Make sure the entry is not a heading before considering it
          var itemText = listItems[i];
          if (!this.itemTextIsHeading(itemText)) {
            var itemTextLC = itemText.toLowerCase();
            // Also remove non-word characters from the start of the string.
            itemTextLC = itemTextLC.replace(/^\W+/, '');

            var matchIndex = itemTextLC.indexOf(elemValue);
            var itemTextLength = itemText.length;
            if (matchIndex === 0) {
              // if searching by list item #, then ignore length and highlight
              // first element
              if ((/(^\d+$)/).test(elemValue)) {
                beginMatchMinLengthIndex = 0;
                beginMatchMinLength = 0;
              }
              else if (itemTextLength < beginMatchMinLength) {
                beginMatchMinLengthIndex = i;
                beginMatchMinLength = itemTextLength;
              }
            }
            else if (beginMatchMinLengthIndex === -1) { // no begin match found yet
              if (matchIndex > 0) {
                if (itemTextLength < innerMatchMinLength) {
                  innerMatchMinLengthIndex = i;
                  innerMatchMinLength = itemTextLength;
                }
              }
              else if (innerMatchMinLengthIndex === -1 && // no inner match yet
                       itemTextLength < minLength) {
                minLength = itemTextLength;
                minLengthIndex = i;
              }
            }
          }
        }

        if (beginMatchMinLengthIndex > -1)
          rtn = beginMatchMinLengthIndex;
        else if (innerMatchMinLengthIndex > -1)
          rtn = innerMatchMinLengthIndex;
        else
          rtn = minLengthIndex;
      } // if we have some entries

      return rtn;
    },


    /**
     *  Positions the answer list.
     */
    posAnsList: function() {
      this.posListBelowFieldInMultiCol();
      // If the list was already showing, made sure the currently selected item
      // is still in view after the repositioning (which sets the scrollTop
      // of the container back to 0.)
      if (this.index > 0)
        this.scrollToShow(this.getCurrentEntry(),  $('completionOptionsScroller'));
    },


    /**
     *  Positions the list below the field, using a multicolumn format if
     *  necessary and scrolling the document up to show the multicolumn list if
     *  necessary.  This is like the old "posListInMultiCol", but the list is
     *  always below the field.
     */
    posListBelowFieldInMultiCol: function() {
      var sharedDOMCache = Def.Autocompleter.sharedDOMCache;
      var element = this.domCache.element;
      var update = this.update;

      // Clear previous settings
      this.domCache.invalidate('elemPos');
      sharedDOMCache.invalidate('firstEntryWidth');
      sharedDOMCache.invalidate('listBoundingRect');
      sharedDOMCache.invalidate('viewPortWidth');
      if (update.style.height)
        update.style.height = '';  // Turn off height setting, if any
      this.setListWrap(false);
      update.style.width = 'auto';
      $('completionOptionsScroller').style.height = '';
      this.listContainer.style.width = '';
      this.listHeight = undefined;

      // Positioning strategies (in order of attempt) to show all of the list
      // element within the viewport.
      // 1) list below field as a single column list, with no constraint on
      // height.  If that fits in the viewport's height, adjust left position as
      // necessary.
      // 2) list below field as a two column wrapped list.  If that fits in the
      // viewports height, and the wider form can fit within the viewport width,
      // adjust the left position as necessary.  If the new width is too wide
      // for the viewport, revert to the single column list, and adjust the left
      // position as needed.
      // 3) scroll page up to make room for the list below field
      // 4) constrain the list height.  If the addition of a scrollbar on the
      // list makes a two-column list too wide for the viewport, revert to a
      // single column list.  Adjust the left position as necessary.
      // 5) If we can't constrain the list height (because it would be too
      // short), then just adjust the left position.

      // First put the list below the field as a single column list.
      // Moving the list can result in the window scrollbar either appearing or
      // disappearing, which can change the position of the field.  So, first
      // hide the list to determine the element position.  Unfortunately this
      // introduces an additional 1ms of positioning time, but I don't see a
      // good way to avoid that.
      var positionedElement = this.listContainer;
      positionedElement.style.display = 'none';
      var elemPos = this.domCache.get('elemPos');
      positionedElement.style.display = '';

      positionedElement.style.top = elemPos.top + element.offsetHeight + 'px';
      var scrolledContainer = this.scrolledContainer_;
      var viewPortHeight = document.documentElement.clientHeight;
      var maxListContainerBottom = viewPortHeight; // bottom edge of viewport
      var posElVPCoords = sharedDOMCache.get('listBoundingRect');
      var bottomOfListContainer = posElVPCoords.bottom;
      if (bottomOfListContainer <= maxListContainerBottom) {
        this.setListLeft();  // We're done positioning the list
      }
      else {
        // If this list is not completely on the page, try making it a multi-column
        // list (unless it is a table format list, which already has columns).
        var tryMultiColumn = this.twoColumnFlow_ && !this.options.tableFormat &&
          this.entryCount > 4; // otherwise it's too short
        if (tryMultiColumn) {
          tryMultiColumn = this.setListWrap(true);
          if (tryMultiColumn) {
            // We wrapped the list, so update the bottom position
            bottomOfListContainer =
              sharedDOMCache.get('listBoundingRect').bottom;
          }
        }
        if (tryMultiColumn && bottomOfListContainer <= maxListContainerBottom) {
          this.setListLeft();  // We're done positioning the list
        }
        else {
          // The multi-column list is still not on the page, try scrolling the
          // page down (making the list go up).
          var elementBoundingRect = element.getBoundingClientRect();
          var heightConstraint = undefined;
          if (!scrolledContainer) {
            heightConstraint = window.innerHeight - elementBoundingRect.bottom;
          }
          else {
            // Cancel any active scroll effect
            if (this.lastScrollEffect_)
              this.lastScrollEffect_.cancel();

            var scrollDownAmount =
              bottomOfListContainer - maxListContainerBottom;
            var elementTop = elementBoundingRect.top;
            var topNavBarHeight = 0;
            var headerBarID = this.constructorOpts_.headerBar;
            if (headerBarID) {
              var headerBar = document.getElementById(headerBarID);
              if (headerBar)
                topNavBarHeight = headerBar.offsetHeight;
            }

            var maxScroll;
            var scrolledContainerViewportTop =
              scrolledContainer.getBoundingClientRect().top;
            if (scrolledContainerViewportTop > topNavBarHeight)
              maxScroll = elementTop - scrolledContainerViewportTop;
            else
              maxScroll = elementTop - topNavBarHeight;

            // Make sure we don't scroll the field out of view.
            if (scrollDownAmount > maxScroll) {
              scrollDownAmount = maxScroll;
              // Also constrain the height of the list, so the bottom is on the page
              // The maximum allowable space is the viewport height minus the field
              // height minus the top nav bar height minus the part of the list
              // container that is not for list items (e.g. "See more results")).
              heightConstraint = viewPortHeight - elementBoundingRect.height -
                topNavBarHeight;
            }

            bottomOfListContainer = heightConstraint === undefined ?
              sharedDOMCache.get('listBoundingRect').bottom :
              sharedDOMCache.get('listBoundingRect').top + heightConstraint;

            // If the list is extending beyond the bottom of the page's normal
            // limits, increasing the page's length, extend the spacer div to make
            // sure the size does not diminish.  This should prevent the "bouncing"
            // effect we were getting when typing into the field, where the page
            // would first scroll up to accomodate a large list, and then as more
            // keystrokes were enterd the list got smaller, so the page scrolled
            // back down.  (The browser does that automatically when the page
            // shrinks.)
            var spacerCoords = sharedDOMCache.get('spacerCoords');

            if (bottomOfListContainer > spacerCoords.bottom) {
              var spacerDiv = sharedDOMCache.get('spacerDiv');
              spacerDiv.style.height =
                bottomOfListContainer - spacerCoords.top + 'px';
              sharedDOMCache.invalidate('spacerCoords');
            }

            this.lastScrollEffect_ = new Def.Effect.Scroll(scrolledContainer,
              {y: scrollDownAmount, duration: 0.4});
          }

          if (heightConstraint !== undefined) {
            // If we can't scroll the list into view, just constrain the height so
            // the list is visible.
            var elementRect = this.setListHeight(heightConstraint);
            // Setting this list height likely introduced a scrollbar on the list.
            var viewPortWidth = sharedDOMCache.get('viewPortWidth');
            var posElVPCoords = sharedDOMCache.get('listBoundingRect');
            if (sharedDOMCache.listWrap && posElVPCoords.width > viewPortWidth) {
              // The list is too wide, so remove the wrap
              this.setListWrap(false);
            }
          }

          this.setListLeft();
        }
      }
    },


    /**
     *  Constructs a cache of DOM values for use during list positioning.
     *  Unliked the sharedDOMCache, each autocompleter has its own one of these.
     */
    initDOMCache: function() {
      var acInstance = this;
      var ac = Def.Autocompleter;
      this.domCache = ac.createDOMCache({
        // element is the positioned element, which might be acInstance.element,
        // or might be a span wrapping it.
        element: acInstance.listPositioningElem()}, {
        // elemPos is the offset of "element" as defined above.
        elemPos: function() {
          return jQuery(this.element).offset();
        },
        // The field value
        elemVal: function() {
          return ac.getFieldVal(acInstance.element);
        }
      });
    },


    /**
     *  Returns the element used for positioning the answer list.
     */
    listPositioningElem: function() {
      // Set "element" to the container of the element and the selected list
      // when this is a multi-select list, so that when the list is scrolled
      // into view, the selected items remain visible.
      return this.multiSelect_ ? this.element.parentNode : this.element;
    },


    /**
     *  Sets whether the list is wrapped to two columns or not.  If there is not
     *  enough space for two columns, then there will be no effect when "wrap"
     *  is true.
     * @param wrap if true, the list will be set to flow into two columns; if
     *  false, it will be set to be just one column.
     *  otherwise.
     * @return true if the list is wrapped
     */
    setListWrap: function(wrap) {
      var sharedDOMCache = Def.Autocompleter.sharedDOMCache;
      if (wrap !== sharedDOMCache.listWrap) {
        if (wrap) {
          // For Chrome, but not Firefox, we need to set the width of the
          // list container; otherwise it will not adjust when the multiple
          // columns are turned on.
          // We set it to be twice the width of a list item plus 4 pixels for
          // the border.
          // There might also be a scrollbar on the list, but we won't know that
          // until we set the height.
          var newListWidth = sharedDOMCache.get('firstEntryWidth') * 2 + 4;
          // Make sure the new width will fit horizontally
          var viewPortWidth = sharedDOMCache.get('viewPortWidth');
          if (newListWidth <= viewPortWidth) {
            this.listContainer.style.width = newListWidth + 'px';
            jQuery(this.update).addClass('multi_col');
            sharedDOMCache.listWrap = true;
          }
        }
        else {
          jQuery(this.update).removeClass('multi_col');
          this.listContainer.style.width = ''; // reset it
          sharedDOMCache.listWrap = false;
          // There could now be a vertical scrollbar on the window, reducing
          // horizontal viewport space.
          sharedDOMCache.invalidate('viewPortWidth');
        }
        sharedDOMCache.invalidate('listBoundingRect');
        // The window vertical scrollbar might have appeared/disappeared,
        // causing the field's horizontal position to change
        this.domCache.invalidate('elemPos');
      }
      return sharedDOMCache.listWrap;
    },


    /**
     *  Sets the list's left position to bring it as close as possible to the
     *  left edge of the field and to show as much of the list as possible.
     */
    setListLeft: function() {
      // The window's scrollbar might be showing, and which might or might not
      // be due to the placement of the list.  We could potentially reclaim that
      // space if we move the list left so the scrollbar isn't needed, but that might
      // take time, so don't.
      var positionedElement = this.listContainer;
      var sharedDOMCache = Def.Autocompleter.sharedDOMCache;
      var viewPortWidth = sharedDOMCache.get('viewPortWidth');
      var posElVPCoords = sharedDOMCache.get('listBoundingRect');
      var elemPos = this.domCache.get('elemPos');
      var leftShift = posElVPCoords.width - (viewPortWidth - elemPos.left);
      if (leftShift < 0) // no need to shift
        leftShift = 0;
      var newLeftPos = elemPos.left - leftShift;
      if (newLeftPos < 0)
        newLeftPos = 0;  // don't move the list past the left edge of the page
      var cache = Def.Autocompleter.sharedDOMCache;
      if (cache.listPosLeft !== newLeftPos) {
        positionedElement.style.left = newLeftPos + 'px';
        cache.listPosLeft = newLeftPos;
      }
    },


    /**
     *  Constrains the height of the completion options list.
     * @param height the height for entire list, including the options, the "see
     *  more" link, and the hit count.  This should be an integer number of
     *  pixels.
     */
    setListHeight: function(height) {
      // Subtract from the height the height of the "see more" and hit count
      // divs.  We do this before increasing the width below, because that can
      // change update.height.
      var sharedDOMCache = Def.Autocompleter.sharedDOMCache;
      var posElVPCoords = sharedDOMCache.get('listBoundingRect');
      var height = height - posElVPCoords.height +  // listContainer = everything
                        this.update.offsetHeight;  // update = list items only

      // This will usually be called when the list needs to scroll.
      // First make the list wider to allow room for the scrollbar (which will
      // mostly likely appear) and to avoid squeezing and wrapping the list items.
      this.listContainer.style.width = posElVPCoords.width + 20 + 'px';

      // Multi-column lists typical scroll/overflow to the right, so we have put
      // $('completionOptions') in a container, $('completionOptionsScroller')
      // and set the height on that instead.  This allows the list to be
      // scrolled vertically instead of horizontally (with lots of short
      // columns).
      // Require at least 20 px of height, or give up
      if (height >= 20) {
        $('completionOptionsScroller').style.height = height + 'px';
        sharedDOMCache.invalidate('listBoundingRect');
      }
    },


    /**
     *  Returns the part of the field value (maybe the full field value) that
     *  should be used as the basis for autocompletion.
     */
    getToken: function() {
      var rtn = this.domCache.get('elemVal');
      if (this.options.tokens) {
        var bounds = this.getTokenBounds();
        rtn = rtn.substring(bounds[0], bounds[1]);
      }
      return rtn;
    },


    /**
     *  Returns the indices of the most recently changed part of the element's
     *  value whose boundaries are the closest token characters.  Use when
     *  autocompleting based on just part of the field's value.  Note that the
     *  value is cached.  If you want an updated value, clear this.tokenBounds.
     * @param pos (optional) a position in the string around which to extract
       * the token.  Used when the changed part of the string is not known, or
       * when there is no changed part but the user has clicked on a token.
     */
    getTokenBounds: (function() {
      /*
         This function was used in Scriptaculous, but we are not basing the
         concept of current tokens on what has changed, but on where the
         cursor is in the field.  Retaining for referrence in case we need it.
      function getFirstDifferencePos(newS, oldS) {
        var boundary = Math.min(newS.length, oldS.length);
        for (var index = 0; index < boundary; ++index)
          if (newS[index] != oldS[index])
            return index;
        return boundary;
      };
      */

      return function(pos) {
        if (null != this.tokenBounds) return this.tokenBounds;
        var value = this.domCache.get('elemVal');
        if (value.trim() === '') return [-1, 0];
        // diff = position around which a token will be found.
        var diff =  pos !== undefined ? pos : this.element.selectionStart;
        // var diff = pos !== undefined ? pos :
        //  getFirstDifferencePos(value, this.oldElementValue);
        var offset = (diff == this.oldElementValue.length ? 1 : 0);
        var prevTokenPos = -1, nextTokenPos = value.length;
        var tp;
        for (var index = 0, l = this.options.tokens.length; index < l; ++index) {
          tp = value.lastIndexOf(this.options.tokens[index], diff + offset - 1);
          if (tp > prevTokenPos) prevTokenPos = tp;
          tp = value.indexOf(this.options.tokens[index], diff + offset);
          if (-1 != tp && tp < nextTokenPos) nextTokenPos = tp;
        }
        return (this.tokenBounds = [prevTokenPos + 1, nextTokenPos]);
      }
    })(),


    /**
     *  A copy constructor, for a new field (e.g. another field in a new row
     *  of a table).  This method must be overridden by subclasses.
     * @param fieldID the ID of the field being assigned to the new autocompleter
     *  this method creates.
     * @return a new autocompleter for field field ID
     */
    dupForField: function(fieldID) {
      throw 'dupForField must be overridden by autocompleter subclasses.';
    },


    /**
     *  Initializes the itemToDataIndex_ map.  This should be overridden by
     *  subclasses.
     */
    initItemToDataIndex: function() {
      throw 'initItemToDataIndex must be overridden by autocompleter classes that '+
       'need it';
    },


    /**
     *  Runs the stuff that needs to be run when the field changes.  (This assumes
     *  that the field has changed.)
     * @param matchStatus (optional) Set this to false if this should assume the
     *  field value does not match the list.  If not provided, this.matchStatus_
     *  will be used.
     */
    propagateFieldChanges: function(matchStatus) {
      if (matchStatus === undefined)
        matchStatus = this.matchStatus_;
      // If this autocompleter has a record data requester, run it or clear
      // the output fields.  This will make sure the output fields are clear
      // before the change event observers run for this field, in case one of
      // the change observers wants to use the data model's copy of the output
      // fields.  (If it does, it can wait for the record data requester's
      // latestPendingAjaxRequest_ variable to be null.)
      if (this.recDataRequester_) {
        if (matchStatus && this.domCache.get('elemVal').trim() !== '')
          this.recDataRequester_.requestData();
        else // no data, or no data from list
          this.recDataRequester_.clearDataOutputFields();
      }
    },


    /*
     *  Returns the value the user actually typed in the field (which might
     *  have just been the first few characters of the final list value
     *  following a selection).
     */
    getValTyped: function() {
      return this.preFieldFillVal_ === null ? this.domCache.get('elemVal') :
          this.preFieldFillVal_;
    },


    /**
     *  Notifies event observers of an attempted list selection (which might
     *  actually have just been the user typing a value rather than picking it
     *  from the list).
     * @param valTyped The value the user actually typed in the field (which might
     *  have just been the first few characters of the final list value).
     * @param onList whether the final value was on the list
     * @param removed For multi-select lists, this indicates whether the
     *  selection was actual an unselection, removing the named item from the
     *  list of selected items.  When true, valTyped is the removed value.
     *  (Optional; default false)
     */
    listSelectionNotification: function(valTyped, onList, removed) {
      var finalVal;
      if (removed === undefined)
        removed = false;
      else if (removed) {
        // For this case, we are passing in the removed value via valTyped
        finalVal = valTyped;
        valTyped = '';
      }
      if (finalVal === undefined)
        finalVal = this.domCache.get('elemVal');
      var inputMethod = this.clickSelectionInProgress_ ? 'clicked' :
        this.preFieldFillVal_ === null ? 'typed' : 'arrows';

      var usedList = inputMethod !== 'typed' && onList;
      var newCode = this.getItemCode(finalVal);

      Def.Autocompleter.Event.notifyObservers(this.element, 'LIST_SEL',
        {input_method: inputMethod, val_typed_in: valTyped,
         final_val: finalVal, used_list: usedList,
         list: this.rawList_, on_list: onList, item_code: newCode, removed: removed});
    },


    /**
     *  Attempts to select an item from the list, if possible.  If successful,
     *  this will take care of updating the code field, and running rules.
     * @return true if an item was successfully selected (i.e. the list was active
     *  and the item was on the list), and false if not.
     */
    attemptSelection: function() {
      var canSelect = false;
      var valTyped = this.getValTyped();

      if (this.active) {
        if (this.index === -1) {
          var elemVal = this.domCache.get('elemVal').trim();
          var lcElemVal = elemVal.toLowerCase();
          var caseSensitiveMatchIndex = -1;
          var matchIndex = -1;
          // Allow the selection if what the user typed exactly matches an item
          // in the list, except for case, but prefer a case-sensitive match.
          for (var i=0; i<this.entryCount && caseSensitiveMatchIndex<0; ++i) {
            var li = this.getEntry(i);
            var liVal = this.listItemValue(li);
            if (!this.liIsHeading(li)) {
              if (elemVal === liVal)
                caseSensitiveMatchIndex = i;
              else if (matchIndex < 0 && lcElemVal === liVal.toLowerCase())
                matchIndex = i;
            }
          }
          if (caseSensitiveMatchIndex >= 0) {
            this.index = caseSensitiveMatchIndex;
            canSelect = true;
          }
          else if (matchIndex >= 0) {
            this.index = matchIndex
            canSelect = true;
          }
        }
        else
          canSelect = this.entryCount > 0 && !this.liIsHeading(this.getCurrentEntry());

        this.fieldValIsListVal_ = canSelect;
        if (canSelect) {
          this.active = false;
          this.updateElement(this.getCurrentEntry());
          this.storeSelectedItem();

          // Queue the list selection event before doing further processing,
          // which might trigger other events (i.e. the duplication warning event.)
          if (Def.Autocompleter.Event.callbacks_ !== null)
            this.listSelectionNotification(valTyped, true);

          // Now continue with the processing of the selection.
          this.processedFieldVal_ = Def.Autocompleter.getFieldVal(this.element);
          this.setMatchStatusIndicator(true);
          this.setInvalidValIndicator(false);
          this.propagateFieldChanges();
          if (this.multiSelect_)
            this.moveEntryToSelectedArea();
        }
        // Don't hide the list if this is a multi-select list.
        if (!this.multiSelect_) {
          this.active = false;
          this.hide();
        }
      }

      return canSelect;
    },


    /**
     *  Overrides the base selectEntry to handle the updating of the code field,
     *  etc.  This function assumes that the caller knows there is something
     *  to select.
     */
    selectEntry: function() {
      this.attemptSelection();  // should always succeed (per pre-conditions).
    },


    /**
     *  Takes appropriate action when the user enters something in the field
     *  that is not a list item.
     */
    handleNonListEntry: function() {
      this.propagateFieldChanges(false);

      // For a single selection list, clear the stored selection
      if (!this.multiSelect_) {
        this.selectedCodes_ = {};
        this.selectedItems_ = {};
      }

      // Blank values should not look different than values that haven't been
      // filled in.  They are okay-- at least until a submit, at which point
      // blank required fields will be brought to the user's attention.
      var fieldVal = Def.Autocompleter.getFieldVal(this.element);
      if (Def.Autocompleter.getFieldVal(this.element) === '') {
        this.setMatchStatusIndicator(true);
        this.setInvalidValIndicator(false);
        this.storeSelectedItem('');
        // Send a list selection event for this case.
        if (Def.Autocompleter.Event.callbacks_ !== null)
          this.listSelectionNotification('', false);
        this.processedFieldVal_ = fieldVal;
      }
      else {
        if (this.enabled_) // i.e. if there is a list that should be matched
          this.setMatchStatusIndicator(false);
        // Send a list selection notification for non-matching values too, even
        // if non-matching values aren't allowed (in which case the AngularJS
        // directive listener needs to clean up the model value).
        if (Def.Autocompleter.Event.callbacks_ !== null)
          this.listSelectionNotification(this.getValTyped(), false);
        if (this.matchListValue_) {
          Def.Autocompleter.screenReaderLog(
            'For this field your entry must match an item from the suggestion list.');
          // If the element is not blank, and if a match is required, we set the
          // invalid value indicator.
          this.setInvalidValIndicator(true);
          // Refocus the field.  We have to wait until after the pending
          // focus event (for whatever element might be getting the focus) is
          // processed.  Waiting the smallest amount of time should be sufficient
          // to push this after the pending events.
          this.refocusInProgress_ = true;
          this.processedFieldVal_ = fieldVal;
          setTimeout(jQuery.proxy(function() {
            this.element.focus();
            this.element.select(); // select the text
            // Clear refocusInProgress_, which onFocus also clears, because
            // onFocus isn't called if the field is still focused when focus()
            // is called above.  That happens when you hit return to select an
            // invalid value.
            this.refocusInProgress_ = false;
          }, this));
        }
        else {
          this.storeSelectedItem();
          if (this.multiSelect_)
            this.moveEntryToSelectedArea(); // resets processedFieldVal_
          else
            this.processedFieldVal_ = fieldVal;

          // See if we can find some suggestions for what the user typed.
          // For now, we do not support suggestions for multiselect lists.
          if (this.findSuggestions && this.nonMatchSuggestions_ && !this.multiSelect_) {
            // Use a timeout to let the event that triggered this call finish,
            // before we bring up a dialog box which might change the focus
            // state and interfere with subsequent event handlers after this one.
            // (This was to fix issue 4569, in which the drug use status field's
            // list showed up on top of the dialog box, even though the field
            // had lost focus.  What happened there is that the showing of the
            // dialog box came before the navigation code's attempt to focus
            // the status field, and then when focus() was called the dialog
            // somehow called blur() on the field (perhaps using event capturing)
            // before the autocompleter's focus event handler ran.)
            setTimeout(jQuery.proxy(function() {this.findSuggestions();}, this));
          }
        }
      }
    },


    /**
     *  An event function for when the field changes.
     * @param event the DOM event object for the change event
     */
    onChange: function(event) {
      this.domCache.invalidate('elemVal');
      if (!Def.Autocompleter.completionOptionsScrollerClicked_) {
        // We used to only process the change if this.enabled_ was true.  However,
        // if the list field is changed by a RecordDataRequester, it will not
        // be active and might have an empty list.

        this.handleDataEntry(event);
      }
    },


    /**
     *  An event function for when the field loses focus.
     * @param event the DOM event object for the blur event
     */
    onBlur: function(event) {
      // Ignore blur events on the completionOptionsScroller.
      if (!Def.Autocompleter.completionOptionsScrollerClicked_) {
        // Cancel any active scroll effect
        if (this.lastScrollEffect_)
          this.lastScrollEffect_.cancel();

        // If the user did not type in the field but the value is different from the
        // value when the field was focused (such as via down arrow or a click)
        // we need to simulate the change event.
        var elemVal = Def.Autocompleter.getFieldVal(this.element);
        if (elemVal !== this.processedFieldVal_)
          Def.Event.simulate(this.element, 'change');

        if (this.enabled_ &&
                !(this.refocusInProgress_))
        {
          // The scriptaculous autocompleter uses click events on the list,
          // and so has to do its hide() call via a timeout.  We're using
          // mousedown events, which means the field never loses focus when a list
          // item is clicked, so we can just make the call directly.  For this
          // reason, we don't call the base onBlur.
          // Autocompleter.Base.prototype.onBlur.apply(this, [event]);
          this.hide();
          this.hasFocus = false;
          this.active = false;

          // If the field is invalid and not being refocused (as it would be if the
          // user changed the field value to something invalid) clear the field
          // value.
          // Since the empty field is not an invalid field, we need to set the
          // invalid indicator to false
          if (this.invalidStatus_)
            this.clearInvalidFieldVal();
          else {
            // If the user retyped a non-list value that was in the field, and that
            // value that matches part of an entry but not completely, and the field
            // allows non-list values, then the no-match indicator will have been
            // turned off and no change event will get fired.  We turn it back on
            // here.
            // However, another case is where the user makes a saved row editable, clicks
            // in the new prefetched field (e.g. the strength field) and clicks out again
            // leaving the old value there.  In that case, we do not know whether the field
            // value is in the list or not, because the user has not changed the value.  We
            // could check each item in the list for prefetched lists but not for search lists;
            // however it seems okay to leave the match status indicator alone in this case.  In
            // this case fieldValIsListVal_ will be null (neither true nor false).
            //
            // A third case:  If the user types an invalid value into a field,
            // then erases it and leaves the field, the field is now empty and
            // should have the no-match indicator removed.  In all cases where
            // the field is blank, the no-match indicator should be removed.
            if (Def.Autocompleter.getFieldVal(this.element) === '')
              this.setMatchStatusIndicator(true);
            else if (this.fieldValIsListVal_ === false)
              this.setMatchStatusIndicator(false);
          }
        }
      }
    },


    /**
     *  Clears an (assumed) invalid value from the list field, and resets the
     *  invalid indicator.
     */
    clearInvalidFieldVal: function() {
      this.setFieldVal('', false);
      this.setInvalidValIndicator(false);
      // Also clear the match status flag, because a blank value is okay
      // (except for required fields when the form submits).
      this.setMatchStatusIndicator(true);
      this.listSelectionNotification('', false);
      this.processedFieldVal_ = '';
    },


    /**
     *  A method that gets called when the field gains the focus.
     * @param event the DOM event object for the focus event
     */
    onFocus: function(event) {
      Def.Autocompleter.currentAutoCompField_ = this.element.id;
      // Don't update processedFieldVal_ if we are refocusing due to an invalid
      // value.  processedFieldVal_ should retain the last non-invalid value in
      // the field.
      if (!this.refocusInProgress_)
        this.processedFieldVal_ = Def.Autocompleter.getFieldVal(this.element);

      this.refocusInProgress_ = false;
      this.preFieldFillVal_ = null;
      Def.Autocompleter.Event.notifyObservers(this.element, 'FOCUS',
        {start_val: this.processedFieldVal_});

      // If this is a multi-select list, announce any items in the selected
      // area.
      if (this.multiSelect_) {
        var selectedItems = Object.getOwnPropertyNames(this.selectedItems_);
        var numSelected = selectedItems.length;
        if (numSelected > 0) {
          var msg = 'Above this multi-select field are deselection buttons for '+
            'each selected item.  Currently selected:'+selectedItems.join(', ');
          Def.Autocompleter.screenReaderLog(msg);
        }
      }
    },


    /**
     *  Handles click events on the option list.
     * @param event the DOM event object for the mouse event
     */
    onMouseDown: function(event) {
      // Only process the event if the item is not a heading, but in all cases
      // stop the event so that the list stays open and the field retains focus.
      Def.Autocompleter.stopEvent(event);
      var itemElem = event.target;
      while (itemElem && itemElem.autocompleteIndex === undefined)
        itemElem = itemElem.parentNode;

      if (itemElem && !this.liIsHeading(itemElem)) {
        this.clickSelectionInProgress_ = true;
        this.index = itemElem.autocompleteIndex;
        this.selectEntry();
        this.hide();
        this.clickSelectionInProgress_ = false;
        // Reshow the list if this is a multi-select list.
        if (this.multiSelect_)
          this.showList();
      }

      this.tokenBounds = null; // selection point may have moved
    },


    /**
     *  Handles entry of an item.
     * @param event the DOM event signaling the data entry
     */
    handleDataEntry: function(event) {
      if (this.invalidStatus_ &&
          this.processedFieldVal_ === this.domCache.get('elemVal'))
        this.clearInvalidFieldVal();
      else {
        // If there was a pending autocompletion event (key event) clear it so we
        // don't reshow a list right after this selection.
        if (this.observer)
          clearTimeout(this.observer);

        var elemVal = Def.Autocompleter.getFieldVal(this.element);

        // If the user has changed the value since the last entry/selection,
        // try to use the value to select an item from the list.
        // Don't attempt to make a selection if the user has cleared the field,
        // unless this is a multiselect list, in which case the field will be
        // cleared if another item was selected before this one.
        // Also, note that for multiselect lists the value in the field might
        // not have changed.  It can remain blank while the enter is pressed
        // repeatedly.
        var selectionSucceeded = false;
        if (this.processedFieldVal_ !== elemVal && elemVal !== '')
          selectionSucceeded = this.attemptSelection();
        else if (this.multiSelect_ && elemVal === '' && this.index >= 0)
          selectionSucceeded = this.attemptSelection();

        // If the value changed but we couldn't select it from the list, treat
        // it as a non-list entry.
        if (this.processedFieldVal_ !== elemVal && !selectionSucceeded) {
          if (elemVal === "")
            this.fieldValIsListVal_ = false;
          this.handleNonListEntry();
        }

        if (!this.multiSelect_) {
          this.hide();
          this.active = false;
        }

        // Stop the event if the field is in an invalid state (to avoid form
        // submission.)
        if (!event.stopped && this.matchListValue_ && this.invalidStatus_)
          Def.Autocompleter.stopEvent(event);
      }
    },


    /**
     *  Returns true if the given list item is a list heading rather than a
     *  list item.
     * @param itemText the text of the item from the list
     */
    itemTextIsHeading: function(itemText) {
      var rtn = !!this.numHeadings_; // true if headings exist
      if (rtn) {  // if there are headings
        if (!this.itemToDataIndex_)
          this.initItemToDataIndex();
        var listDataIndex = this.itemToDataIndex_[itemText];
        // heading level 0 means not a heading
        rtn = (listDataIndex !== undefined) &&
              !!(this.indexToHeadingLevel_[listDataIndex]);
      }
      return rtn;
    },


    /**
     *  Returns true if the given LI element is a list heading rather than a
     *  list item.
     * @param li the LI DOM element from the list
     */
    liIsHeading: function(li) {
      var rtn = !!this.numHeadings_; // true if headings exist
      if (rtn) {  // if there are headings
        rtn = this.itemTextIsHeading(this.listItemValue(li));
      }
      return rtn;
    },


    /**
     *  Gets called when the list needs to be shown.
     * @param element the autocompleter's field
     * @param update the DOM element that gets updated with the list
     */
    onShow: function(element, update) {
      element.autocomp.showList();
    },


    /**
     *  Gets called when the list needs to be hidden.
     * @param element the autocompleter's field
     * @param update the DOM element that gets updated with the list
     */
    onHide: function(element, update) {
      element.autocomp.hideList();
    },


    /**
     *  Moves the selected item to the other column, if there are two columns
     *  in the list.  (This is called when the user hits the right or left arrow.)
     *  This method assumes that the list is active and there is a selected item
     *  in the list (i.e., that the user has arrowed down into the list).
     * @param event the event that triggered this.  If moving to the other
     *  column is possible, the event will be stopped.
     */
    moveToOtherColumn: function(event) {
      // This is designed to work whether the number of items is odd or even.
      // If the number of items is odd and the current index is the middle
      // value, then there is no item in the other column so we don't move it.
      // Note that the index starts at zero (so 0 to 6 for 7 items).
      var numItems = Def.Autocompleter.listItemElements().length;
      var half = Math.floor(numItems/2);  // e.g. 3 if numItems == 6 or 7
      var shift = Math.ceil(numItems/2.0);  // e.g. 4 if numItems == 7
      var newIndex = this.index;
      if (this.index < half) // e.g. 0, 1, or 2 if numItems == 6 or 7
        newIndex = this.index + shift;
      else if (this.index >= shift) // e.g. >= 4 if numItems == 7
        newIndex = this.index - shift;

      if (newIndex !== this.index) {
        // Make sure the new index is not a header item.  If so, don't move.
        var newItem = this.getEntry(newIndex);
        if (!this.liIsHeading(newItem)) {
          // Put the value into the field, but don't run the change event yet,
          // because the user has not really selected it.
          this.index = newIndex;
          this.setFieldVal(this.listItemValue(newItem), false);
          this.element.select();
          this.render();
          Def.Autocompleter.stopEvent(event);
        }
      }
    },


    /**
     *  This gets called when the "See more items" link is clicked.  It should
     *  be overridden by subclasses as appropriate.  This default implementation
     *  does nothing.
     * @param event the click event on the link
     */
    handleSeeMoreItems: function(event) {},


    /**
     *  "Reads" the searchCount and moreResults divs via the ScreenReaderLog.
     */
    readSearchCount: function() {
      var rtn = false;
      if ($('searchCount').style.display !== 'none') {
        Def.Autocompleter.screenReaderLog('Showing '+ $('searchCount').innerHTML+ '.');
        if ($('moreResults').style.display !== 'none') {
          Def.Autocompleter.screenReaderLog('Pressing control+return will expand the list.');
        }
        rtn = true;
      }
      return rtn;
    },


    /**
     *  This can be called when an autocompleter is no longer needed.
     *  It performs any needed cleanup of field references and event listeners.
     *  Most sub-classes should not override this directly, but override
     *  stopObservingEvents and detachFromDOM instead.
     */
    destroy: function() {
      //Def.Logger.logMessage(['in autoCompBase.destroy, this.element.id = ',
      //                       this.element.id]) ;
      this.stopObservingEvents();
      this.detachFromDOM();
    },


    /**
     *  This can be called to detach an autocompleter's event listeners.
     */
    stopObservingEvents: function() {
      jQuery(this.element).unbind();
    },


    /**
     *  Frees any references this autocompleter has to DOM objects.
     */
    detachFromDOM: function() {
      this.element.autocomp = null ;
      this.element = null;
      this.update = null;
      this.listContainer = null;
      this.recDataRequester_ = null; // has DOM references
    },


    /**
     *  Updates the field with the selected list item value.
     * @param selectedElement the DOM list element (LI or TR) the user selected.
     */
    updateElement: function(selectedElement) {
      var selectedVal = this.listItemValue(selectedElement);
      var newFieldVal = selectedVal;
      if (this.options.tokens) { // We're autocompleting on paritial field values
        var bounds = this.getTokenBounds();
        if (bounds[0] != -1) {
          var currentVal = this.domCache.get('elemVal');
          var newValue = currentVal.substr(0, bounds[0]);
          var whitespace = currentVal.substr(bounds[0]).match(/^\s+/);
          if (whitespace)
            newValue += whitespace[0];
          newFieldVal = newValue + selectedVal + currentVal.substr(bounds[1]);
        }
      }
      this.setFieldVal(newFieldVal, false);
      // The "false" argument above means do not run change observers.  After
      // this gets called, propagateFieldChanges is called, and that takes care
      // of running change event handlers.

      if (this.options.afterUpdateElement)
        this.options.afterUpdateElement(this.element, selectedElement);
    },


    /**
     *  Shows the list.
     */
    show: function() {
      if(jQuery(this.update).css('display')=='none') this.options.onShow(this.element, this.update);
      if(!this.iefix && Browser.IE &&
        (jQuery(this.update).css('position')=='absolute')) {
        new Insertion.After(this.update,
         '<iframe id="' + this.update.id + '_iefix" '+
         'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
         'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
        this.iefix = $(this.update.id+'_iefix');
      }
      if(this.iefix) setTimeout(jQuery.proxy(this.fixIEOverlapping, this), 50);
    },


    // This originally came from controls.js in Scriptaculous.  It seems to be working
    // around some IE bug.  (Rewritten to use jQuery.)
    fixIEOverlapping: function() {
      var updatePos = this.update.offset();
      this.iefix.style.left = updatePos.left;
      if (!this.update.style.height)
        this.update.style.top = updatePos.top;
      this.iefix.style.zIndex = 1;
      this.update.style.zIndex = 2;
      jQuery(this.iefix).show();
    },


    /**
     *  Hides the list.
     */
    hide: function() {
      if(jQuery(this.update).css('display')!='none') this.options.onHide(this.element, this.update);
      if(this.iefix) jQuery(this.iefix).hide();
    },


    /**
     *  Determines the state of the list and its items and shows/hides it as
     *  appropriate.
     */
    render: function() {
      if(this.entryCount > 0) {
        for (var i = 0; i < this.entryCount; i++)
          this.index==i ?
            jQuery(this.getEntry(i)).addClass("selected") :
            jQuery(this.getEntry(i)).removeClass("selected");
        if(this.hasFocus) {
          this.show();
          this.active = true;
        }
      } else {
        this.active = false;
        this.hide();
      }
    },


    /**
     *  Returns the DOM node corresponding to the list item at the given index.
     * @param index the zero-based index of the list item to retrieve.
     */
    getEntry: function(index) {
      return Def.Autocompleter.listItemElements()[index];
    },


    // Copied as-is from controls.js  (remove this comment if you modify it).
    getCurrentEntry: function() {
      return this.getEntry(this.index);
    },


    onObserverEvent: function() {
      this.domCache.invalidate('elemVal'); // presumably the field value changed
      this.changed = false;
      this.tokenBounds = null;
      if(this.getToken().length>=this.options.minChars) {
        this.getUpdatedChoices();
      } else {
        this.active = false;
        this.hide();
      }
      this.oldElementValue = this.domCache.get('elemVal');
    }

  };  // end Def.Autocompleter.Base class

  jQuery.extend(Def.Autocompleter.Base.prototype, tmp);
  tmp = null;
})(Def.PrototypeAPI.$, jQuery, Def);
