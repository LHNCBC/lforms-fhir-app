// An AngularJS directive (optional; for use if you are using AngularJS)
//
// Example:
// <input id="myfield" autocomplete-lhc="opts" ng-model="selectedVal">
//
// The opts object (which could be a function that returns an object) contains
// the information needed for specifying the behavior of the autocompleter (e.g.
// what should be in the list).  There are two types of autocompleters.  You can
// either have a "prefetched" list where all the items are given to the autocompleter
// at construction time, or a "search" list where the list items are discovered
// as the user types, via AJAX calls.  For both types, opts is a hash, but the
// keys on the hash differ.
//
// For "prefetched lists", opts can contain:
// 1) listItems - (required) This is the list item data.  It should be an array,
//    and each element in the array should have a "text" property (or, if the
//    "display" option is set below, property of display's value) which is the
//    display string the user sees.  The object containing that text property
//    is what will get stored on the model you have associated via ng-model
//    (selectedVal, in the example above).
// 2) maxSelect - (default: 1) the maximum number of items that can be selected
//    from the list.  If this is '*', an unlimited number can be selected.  When
//    more than one item can be selected, selected items are stored in an array
//    on the model (e.g., selectedVal becomes an array).
// 3) defaultValue - The default value for the field.  This setting also exists in
//    the non-directive prefetch lists, but there are two differences here:
//    a) defaultValue can either be one of the list item display strings (the
//       "text" property), or it can be a hash like {code: 'AF-5'}, where "code" is
//       a key on the list item object, and 'AF-5' is the value of that key
//       to select the item as the default.  This is to allow the default value
//       to be specified not just by the display string, but by other attributes
//       of the list item object.
//    b) the default list item is loaded into the field when the autocompletion
//       is set up.
// 4) display - (default "text") the property of the objects in listItems which
//    should be displayed in the list.
// 5) Any other parameters used by the Def.Autocomp.Prefetch constructor defined in
//    autoCompPrefetch.js.  (Look at the options parameter in the initialize method).
//
// For "search" lists, opts can contain:
// 1) url - (required) The URL to which requests for data should be sent.  For
//    details about expected parameters and response data, see the comments for the
//    Def.Autocomp.Search constructor (the initialize method in autoCompSearch.js.)
// 2) Any other parameters used by the Def.Autocomp.Search constructor defiend
//    in autoCompSearch.js.  (Look at the options parameter in the initialize
//    method.)
//
// For search lists, the model data object (selectedVal in the example above)
// will become an array of objects if maxSelect is set to '*' to allow multiple
// selections. (That much is also true for prefetched lists, as noted above.)
// The object for each selected item will have a "text" property corresponding
// to the display text for the selected item, and a "code" property as returned
// by the URL's JSON response.   (For details of the return format, see
// the constructor comments in autoCompSearch.js).
//
// Search lists' URLs can respond with a hash of additional field data in the
// third element of the returned JSON array.  These extra data elements
// will be placed in a sub-object of the model object under the property "data".
// For example, {text: // display text, code: // code for display text,
//   data: { //extra field data here}}
//
// For both types of lists, if the list is configured to allow entry of off-list
// values, the model data objects for such items will have an additional
// property, _notOnList, set to true.


// Wrap the definitions in a function to protect our version of global variables
(function(Def) {
  "use strict";

  var AutocompInitializer = Def.PrototypeAPI.Class.create({
    /**
     *  Constructor.
     * @param acOptions the options hash passed to the directive
     *  for configuring the autocompleter.
     * @param scope the AngularJS scope
     * @param element the jQuery-wrapped element for which an autocompleter is
     *  being created.
     * @param controller the AngularJS controller
     */
    initialize: function(acOptions, scope, element, controller) {
      this.displayedProp = acOptions.display || 'text';
      this.scope = scope;
      this.acOptions = acOptions;

      if (controller) { // ngModelController, from the "require"
        this.pElem = element[0];

        // if there's an autocomp already
        var oldAC = this.pElem.autocomp;
        if (oldAC) {
          // Destroy the existing autocomp
          oldAC.destroy();
          // clean up the model data
          scope.modelData = null;
          // Remove the formatter and parser we defined for the previous
          // autocompleter.
          this.removeAutocompFunction(controller.$formatters);
          this.removeAutocompFunction(controller.$parsers);
        }

        this.ac = acOptions.hasOwnProperty('url') ?
         this.searchList() : this.prefetchList();

        // See if there is an existing model value for the field (which
        // might have been set by the prefetchList call above, if there
        // was a default value for the field).
        var md = scope.modelData;
        var hasPrepoluatedModel = (md !== undefined) && (md !== null);

        // If there is a already a model value for this field, load it
        // into the autocompleter.
        if (hasPrepoluatedModel) {
          if (this.ac.multiSelect_) {  // in this case md is an array
            for (var i=0, len=md.length; i<len; ++i) {
              var dispVal = md[i][this.displayedProp];
              this.ac.storeSelectedItem(dispVal, md[i].code);
              this.ac.addToSelectedArea(dispVal);
            }
            // Clear the field value for multi-select lists
            this.ac.setFieldVal('', false);
          }
          else {
            var dispVal = md[this.displayedProp];
            if (typeof dispVal === 'string') {
              this.ac.storeSelectedItem(dispVal, md.code);
              this.ac.setFieldVal(dispVal, false);
            }
            else // handle the case of an empty object as a model
              this.ac.setFieldVal('', false);
          }
        }

        this.parser = this.parser.bind(this);
        this.parser.fromAutocomp = true;
        controller.$parsers.push(this.parser);

        this.formatter = this.formatter.bind(this);
        this.formatter.fromAutocomp = true;
        controller.$formatters.push(this.formatter);
      } // if controller
    },


    /**
     *  A parser to convert from the field value to the object
     *  containing the value and (e.g.) code.
     * @param value the field value
     * @return the model object.
     */
    parser: function (value) {
      // Just rely on the autocompleter list selection event to manage
      // model updates.  Here we will just return the model object, to
      // prevent any change to the model from the parsers.
      var rtn = this.scope.modelData;
      // Returning "undefined" means the value is invalid and will cause
      // the ng-invalid-parse class to get added.  Switch to null.
      if (rtn === undefined)
        rtn = null;
      return rtn;
    },


    /**
     *  A formatter to get the display string if the model is changed.
     * @param value the model object
     * @return the display string for the field value
     */
    formatter: function (value) {
      var rtn = '';
      if (!this.ac.multiSelect_) {
        if (typeof value === 'string')
          rtn = value;
        else if (value !== null && typeof value === 'object' &&
                 typeof value[this.displayedProp] === "string") {
          rtn = value[this.displayedProp];
        }
        rtn = rtn.trim();
      }
      else
        rtn = '';

      // If angular is setting the field value, we have to let the
      // autocompleter know.
      this.ac.setFieldVal(rtn, false);

      return rtn;
    },


    /**
     *  Returns model data for the field value "finalVal".  (Used for Prefetch
     *  lists.)  If the field is empty, null will be returned.
     * @param finaVal the field value after list selection.  This is the
     *  trimmed "text" value, which will be in the returned model object.
     * @param itemTextToItem a hash of list values to model data objects
     */
    getPrefetchItemModelData: function (finalVal, itemTextToItem) {
      var item = itemTextToItem[finalVal];
      if (!item) {
        if (finalVal != '') {
          item = {_notOnList: true};
          item[this.displayedProp] = finalVal;
        }
        else // no value in the field
          item = null;
      }
      return item;
    },


    /**
     *  Handles a prefetch list selection event.
     * @param eventData the data about the selection event.
     * @param itemTextToItem a hash from display strings to items
     */
    prefetchListSelHandler: function (eventData, itemTextToItem) {
      var finalVal = eventData.final_val;
      // finalVal is a trimmed version of the text.  Use that for
      // the model data.
      if (!this.ac.multiSelect_) {
        // Even if the field value is not valid, we need to update the model;
        // clearing the model would clear the field.
        this.scope.modelData =
          this.getPrefetchItemModelData(finalVal, itemTextToItem);
      }
      else {
        if (!this.scope.modelData)
          this.scope.modelData = [];
        var selectedItems = this.scope.modelData;
        if (eventData.removed) {
          // The item was removed
          var removedVal = eventData.final_val;
          for (var i = 0, len = selectedItems.length; i < len; ++i) {
            if (removedVal === selectedItems[i][this.displayedProp]) {
              selectedItems.splice(i, 1);
              break;
            }
          }
        }
        else if (eventData.on_list || !this.acOptions.matchListValue) {
          // (Add the new model item, but not if it is invalid)
          var newModel = this.getPrefetchItemModelData(finalVal, itemTextToItem);
          if (newModel) // could be null if the field value was empty
            selectedItems.push(newModel);
        }
      }
    },


    /**
     *  Sets up a prefetched list on the field.
     */
    prefetchList: function () {
      var itemText = [];
      var itemTextToItem = {};

      // See if we have a default value, unless the model is already
      // populated.
      var acOptions = this.acOptions;
      var defaultKey = null; // null means not using a default
      var defaultValueSpec = acOptions.defaultValue;
      var defaultKeyVal = null; // the value in defaultValueSpec corresponding to defaultKey
      var displayedProp = this.displayedProp;
      if (defaultValueSpec !== undefined &&
          (this.scope.modelData === undefined || this.scope.modelData === null)) {
        if (typeof defaultValueSpec === 'string') {
          defaultKey = displayedProp;
          defaultKeyVal = defaultValueSpec;
        }
        else { // an object like {code: 'AL-23'}
          defaultKey = Object.keys(defaultValueSpec)[0];
          defaultKeyVal = defaultValueSpec[defaultKey];
        }
      }

      // "listItems" = list item data.
      var modelDefault = null;
      var oneItemText;
      for (var i=0, numItems=acOptions.listItems.length; i<numItems; ++i) {
        var item = acOptions.listItems[i];
        oneItemText = item[displayedProp];
        itemText[i] = oneItemText;
        var trimmedText = oneItemText.trim();
        itemTextToItem[trimmedText] = item;
        if (defaultKey && item[defaultKey].trim() === defaultKeyVal)
          modelDefault = this.getPrefetchItemModelData(trimmedText, itemTextToItem);
      }

      var ac = new Def.Autocompleter.Prefetch(this.pElem, itemText, acOptions);
      this.addNameAttr();
      var self = this;
      this.updateListSelectionHandler(function(eventData) {
        self.scope.$apply(function() {
          self.prefetchListSelHandler(eventData, itemTextToItem);
        });
      });

      // If we have a default value, assign it to the model.
      if (modelDefault !== null && !this.scope.modelData)
        this.scope.modelData = ac.multiSelect_ ? [modelDefault] : modelDefault;

      return ac;
    },


    /**
     *  Returns the model data structure for a selected item in a search
     *  list.  If the field is empty, null will be returned.
     * @param itemText the display string of the selected item
     * @param onList true if the selected item was from the list
     */
    getSearchItemModelData: function (itemText, onList) {
      var rtn;
      if (itemText === '')
        rtn = null;
      else {
        rtn = this.ac.getItemData(itemText);
        if (!onList)
          rtn._notOnList = true;
      }
      return rtn;
    },


    /**
     *  Assigns a name to the field if it is missing one.
     *  Names are used to register listeners.  We don't do this in the
     *  autocompleter base class to avoid polluting submitted form data
     *  with unintended fields.
     */
    addNameAttr: function () {
      // If the element does not have a name, use the ID.  The name
      // to register listeners.
      if (this.pElem.name === '')
        this.pElem.name = this.pElem.id;
    },


    /**
     *  Handles a search list selection event.
     * @param eventData the data about the selection event.
     */
    searchListSelHandler: function (eventData) {
      var itemText = eventData.final_val;
      var onList = eventData.on_list;
      if (!this.ac.multiSelect_) {
        // Even if the field value is not valid, we need to update the model;
        // clearing the model would clear the field.
        this.scope.modelData = this.getSearchItemModelData(itemText, onList);
      }
      else {
        if (!this.scope.modelData)
          this.scope.modelData = [];
        var selectedItems = this.scope.modelData;
        if (eventData.removed) {
          // The item was removed
          var removedVal = eventData.final_val;
          for (var i = 0, len = selectedItems.length; i < len; ++i) {
            if (removedVal === selectedItems[i].text) {
              selectedItems.splice(i, 1);
              break;
            }
          }
        }
        else if (eventData.on_list || !this.acOptions.matchListValue) {
          // (Add the new model item, but not if it is invalid)
          var newModel = this.getSearchItemModelData(itemText, onList);
          if (newModel) // could be null if the field value was empty
            selectedItems.push(newModel);
        }
      }
    },


    /**
     *  Sets up a search list on the field.
     */
    searchList: function () {
      var ac = new Def.Autocompleter.Search(this.pElem, this.acOptions.url, this.acOptions);
      this.addNameAttr();
      var self = this;
      this.updateListSelectionHandler(function(eventData) {
        self.scope.$apply(function() {
          self.searchListSelHandler(eventData);
        });
      });
      return ac;
    },


    /**
     *  Takes an array of functions, and removes the first found that is
     *  flagged as being from an autocompleter.
     * @param functionList the array of functions
     */
    removeAutocompFunction: function (functionList) {
      for (var i=0, len=functionList.length; i<len; ++i) {
        if (functionList[i].fromAutocomp) {
          functionList.splice(i, 1);
          break;
        }
      }
    },


    /**
     *  Updates (replaces) the list selection event handler.
     * @param handler the list selection event handler to be assigned
     */
    updateListSelectionHandler: function (handler) {
      var field = this.pElem;
      var fieldKey = Def.Observable.lookupKey(field);
      var eh = Def.Autocompleter.directiveListEventHandlers;
      var oldHandler = eh[field.id];
      if (oldHandler) {
        Def.Autocompleter.Event.removeCallback(fieldKey, 'LIST_SEL',
          oldHandler);
      }
      Def.Autocompleter.Event.observeListSelections(fieldKey,
        handler);
      eh[field.id] = handler;
    }
  }); // class AutocompInitializer



  // Keep track of created list event handlers.  This is a hash of field IDs to
  // handler functions.
  Def.Autocompleter.directiveListEventHandlers = {};

  if (typeof angular !== 'undefined') {
    angular.module('autocompleteLhcMod', [])

      .directive('autocompleteLhc', [function () {
        return {
          restrict: 'A',
          require:'?ngModel',
          scope: {
            modelData: '=ngModel', // the ng-model attribute on the tag
            acOpts: '=autocompleteLhc'
          },
          link:function (scope, element, attrs, controller) {
            // Set the update options to 'none' so only the autocompleter code
            // updates the model.
            if (!controller.$options)
              controller.$options = {};
            controller.$options.updateOn = 'none';
            controller.$options.updateOnDefault = false;

            function initWidget(options) {
              new AutocompInitializer(options, scope, element, controller);
            }
            // Re-initialize the autocomplete widget whenever the options change
            scope.$watch("acOpts", initWidget, true);
          }
        };
      }]
    );
  }
})(Def);
