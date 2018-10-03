/**
 *  A class for a draggable dialog that closes when you click on the
 *  background of the dialog.  (This option for closing is required to work
 *  around a dojo bug that lets you drag the dialog outside of the visible
 *  area.)  This kind of dialog is useful in situations that do not require
 *  a response from the user.
 */
if (typeof Def === 'undefined')
  window.Def = {};

// Wrap the definitions in a function to protect our version of global variables
(function($, jQuery, Def) {
  "use strict";

  var Class = Def.PrototypeAPI.Class;
  Def.NoticeDialog = Class.create({});

  var instanceMembers = {
    /**
     *  The dialog instance-- actually, an array containing the dialog, but
     *  the array has special JQuery methods defined on it.
     */
    dialog_: null,

    /**
     *  Constructor.
     * @param options - A hash of options, though at the moment we only support
     *  'width' and 'title'.
     */
    initialize: function(options) {
      // See JQuery Dialog for other options its contructor supports if more are
      // needed.
      if (!options)
        options = {};
      options['autoOpen'] = false;
      options['modal'] = true;
      options['close'] = function() {}
      this.dialog_ = jQuery('<div></div>').dialog(options);
    },


    /**
     *  Overrides the show method to add a click event listener on the dialog's
     *  background div to hide the dialog when clicked.  The dialog's background
     *  div is not created until the first time a dialog is shown.  It is shared
     *  by all dialogs, and not all dialogs would want this behavior, so we
     *  add and remove the event listener when this dialog is shown or hidden.
     */
    show: function() {
      // In this acceptance test runner, for some reason the opening of the
      // dialog triggers a second change event on the field that is opening
      // the dialog, and it tries to open it twice, so we guard against
      // that by setting a flag.
      if (!this.opening_) {
        this.opening_ = true;
        // The dialog's parent node's parent node encloses an overlay after the
        // dialog is opened, so we define an event handler on that node to handle
        // the click event (on the background) to close the dialog.
        var containerNode = this.dialog_[0].parentNode.parentNode;
        this.backgroundListener_ =
          jQuery.proxy(function() {this.dialog_.dialog('close')}, this);
        jQuery(containerNode).delegate('.ui-widget-overlay', 'click',
          this.backgroundListener_);

        // When the dialog closes, we need to unregister the event handler, or we
        // will create multiple copies of them.  Note that below we are using
        // JQuery's bind (not Prototype's), defined on the dialog_ array.
        this.dialog_.bind('dialogclose', jQuery.proxy(function() {
          jQuery(containerNode).undelegate('.ui-widget-overlay', 'click',
            this.backgroundListener_);
        }, this));

        this.dialog_.dialog('open');
        // Remove the focus from the fields on the form by putting the focus
        // on the dialog box (in particular, the X button).  For some reason,
        // calling focus directly does not work.  We need to call it from within
        // a timeout.
        setTimeout(jQuery.proxy(function(){
          var closeButtonContainer = jQuery(this.dialog_[0].parentNode);
          closeButtonContainer.find('.ui-dialog-titlebar-close')[0].focus()
        }, this));

        this.opening_ = false;
      }
    },


    /**
     *  Closes the dialog.
     */
    hide: function() {
      var containerNode = this.dialog_[0].parentNode.parentNode;
      jQuery(containerNode).undelegate('.ui-widget-overlay', 'click',
        this.backgroundListener_);
      this.dialog_.dialog('close');
    },


    /**
     *  Returns true if the dialog is currently open.
     */
    isOpen: function() {
      return this.dialog_.dialog('isOpen');
    },


    /**
     *  Sets the HTML content of the dialog.
     * @param html the html for the dialog's content.
     */
    setContent: function(html) {
      this.dialog_.html(html);
      if (Def.IDCache)
        Def.IDCache.addToCache(this.dialog_[0]);
    },

    /**
     *  Sets the title of the dialog.
     */
    setTitle: function(title) {
      this.dialog_.dialog('option', 'title', title);
    }
  }
  Def.NoticeDialog.addMethods(instanceMembers);



  /**
   *  A class for a draggable dialog that does not close ie is truly modal)
   *  when you click on the background of the dialog. This kind of dialog is
   *  useful in situations that require a response from the user. Follows
   *  similar pattern as NoticeDialog but is truely modal.
   */
  Def.ModalPopupDialog = Class.create({});
  jQuery.extend(Def.ModalPopupDialog.prototype, Def.NoticeDialog.prototype) ;

  var modInstanceMembers = {

    /**
     *  Opens up the modal dialog window
     */
    show: function() {
      // In this acceptance test runner, for some reason the opening of the
      // dialog triggers a second change event on the field that is opening
      // the dialog, and it tries to open it twice, so we guard against
      // that by setting a flag.
      if (!this.opening_) {
        this.opening_ = true;
        this.dialog_.dialog('open');
        this.opening_ = false;
      }
    },

    /**
     *  Closes the dialog.
     */
    hide: function() {
      this.dialog_.dialog('close');
    }
  }

  Def.ModalPopupDialog.addMethods(modInstanceMembers);
})(Def.PrototypeAPI.$, jQuery, Def);
