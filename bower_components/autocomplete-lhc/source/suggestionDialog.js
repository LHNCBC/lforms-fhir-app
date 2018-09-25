// Wrap the definitions in a function to protect our version of global variables
(function($, jQuery, Def) {
  "use strict";

  var Class = Def.PrototypeAPI.Class;

  /**
   *  A dialog for showing suggestion lists when the user leaves a search field
   *  without using its list.
   */
  Def.Autocompleter.SuggestionDialog = Class.create({});
  jQuery.extend(Def.Autocompleter.SuggestionDialog.prototype,
    Def.NoticeDialog.prototype);

  var classMembers = {
    /**
     *  Returns the suggestion dialog widget, creating it if needed.
     */
    getSuggestionDialog: function() {
      var rtn = this.suggestionDialog_;
      if (!rtn) {
        rtn  = this.suggestionDialog_ = new Def.Autocompleter.SuggestionDialog({
          width: 400
        });
        rtn.resetDialog();
      }
      return rtn;
    }
  };
  jQuery.extend(Def.Autocompleter.SuggestionDialog, classMembers);
  classMembers = null;

  var instanceMembers = {
    /**
     *  Sets the basic DOM structure of the dialog when we know we are about
     *  to show a suggestion list.
     * @param element the DOM element for the field for which the suggestions
     *  are to be made.
     */
    prepareSuggestionDialogForList: function(element) {
      this.setTitle('Did you mean...');
      this.setContent('The value "<em><span id="suggestionFieldVal"></span></em>" '+
        'is not on our standard list of possible values.'+
        '<div id="suggestionList" style="margin-top: 1em; margin-bottom: 1em">'+
        '</div>');
      $('suggestionFieldVal').innerHTML = Def.PrototypeAPI.escapeHTML(element.value);
    },


    /**
     *  Initializes the suggestion dialog for a new suggestion request.
     */
    resetDialog:  function() {
      this.setTitle('Please Wait');
      this.setContent('Please wait a second or two while we try to find '+
        '"<span id="suggestionFieldVal" aria-live="assertive"></span>"....');
    },


    /**
     *  Shows the given suggestions.
     * @param listItems an array of suggested terms.
     * @param field the DOM element of the field for which the suggestions are
     *  being provided.
     */
    showSuggestions: function(listItems, field) {
      var listItemParts = ['<ul>'];
      for (var i=0, max=listItems.length; i<max; ++i) {
        listItemParts.push('<li><a href="" onclick="');
        listItemParts.push('Def.Autocompleter.SuggestionDialog.getSuggestionDialog().hide();');
        listItemParts.push('jQuery(\'#');
        listItemParts.push(field.id);
        listItemParts.push('\')[0].autocomp.acceptSuggestion(\'');
        listItemParts.push(i);
        listItemParts.push('\'); return false">');
        listItemParts.push(listItems[i]);
        listItemParts.push('</a></li>');
      }
      listItemParts.push('</ul>');

      $('suggestionList').innerHTML =
        'That is okay, but is one of the following values what you mean?'+
        listItemParts.join('')+
        'If none of these are right, '+this.returnToFieldLink(field)+
        ' and backspace a few letters to be sure the '+
        'choice you want was not in the choice menu, check the spelling '+
        'carefully and re-enter if wrong, or accept what you have '+
        'entered but realize it will not be understood by any of the '+
        'checking processes.';
    },


    /**
     *  Sets the dialog to show the message for the case when no suggestions are
     *  found.
     * @param field the DOM element of the field for which the suggestions were
     *  being provided.
     */
    showNotFoundMsg: function(field) {
      $('suggestionList').innerHTML = 'We were not able to find any '+
        'standard values that came close to what you entered.  You might '+
        'want to '+this.returnToFieldLink(field)+
        ' and backspace a few letters to be sure the '+
        'choice you want was not in the choice menu, or check the spelling '+
        'carefully and re-enter if wrong.  You can let it remain as '+
        'entered, but realize that it will not be understood by any of the '+
        'checking processes.';
    },


    /**
     *  Returns the HTML for a link that returns the user to the given field.
     * @param field the DOM element of the field for which the suggestions are
     *  being provided.
     */
    returnToFieldLink: function(field) {
      return "<a id=returnLink href='javascript:void(0)' "+
        "onclick='Def.Autocompleter.SuggestionDialog.getSuggestionDialog().hide(); "+
        "var e = $(\"#"+field.id+"\")[0]; e.focus(); "+
        "e.selectionStart = e.selectionEnd; return false'>return to the field</a>";
    }
  };
  jQuery.extend(Def.Autocompleter.SuggestionDialog.prototype, instanceMembers);
  instanceMembers = null;
})(Def.PrototypeAPI.$, jQuery, Def);
