(function(Def) {
  "use strict";

  /**
   *  This manages a log meant to be used in assisting users with screen readers.
   *  For backwards compatibility, in addition to the constructor,
   *  Def.ScreenReaderLog.add(msg) will log msg to a DOM element with id
   *  "reader_log".  However, that usage is deprecated.
   *  Current usage:  var myLog = new Def.ScreenReaderLog(); myLog.add(msg);
   * @param logID (optional) the ID of the DOM element to use for the log
   */
  Def.ScreenReaderLog = function(logID) {
    if (logID === undefined) {
      // Create a new log element
      var baseID = 'reader_log';
      var logID = baseID;
      var counter = 1;
      while (document.getElementById(logID))
        logID = baseID + ++counter;
      this.logElement_ = document.createElement('div')
      this.logElement_.setAttribute('id', logID);
      document.body.appendChild(this.logElement_);
    }
    else
      this.logElement_ = document.getElementById(logID);
    this.logElement_.setAttribute('aria-live', 'assertive');
    this.logElement_.setAttribute('aria-relevant', 'additions');
    this.logElement_.setAttribute('role', 'log');
    this.logElement_.setAttribute('class', 'screen_reader_only');
  }

  Def.ScreenReaderLog.prototype = {
    /**
     *  Adds some text to the log to be read by the screen reader.
     * @param text the text to be read (hopefully immediately).  Note that at
     *  least with JAWS, sometimes the text isn't read if other things are
     *  happening at the same time.
     */
    add: function(text) {
      // In Firefox, we can just append the text as a text node.  In IE 9, if
      // you do that, it reads the log text from the beginning with each add.
      // Putting each entry in p tags solves that, and still works okay in
      // Firefox.
      var p = document.createElement('p');
      p.appendChild(document.createTextNode(text));
      this.logElement_.appendChild(p);
    }
  };

  // For backwards compatibility, include a static method
  /**
   *  Adds some text to the log to be read by the screen reader.
   * @param text the text to be read (hopefully immediately).  Note that at
   *  least with JAWS, sometimes the text isn't read if other things are
   *  happening at the same time.
   */
  Def.ScreenReaderLog.add = function(text) {
    if (!this.log_)
      this.log_ = new Def.ScreenReaderLog('reader_log');
    this.log_.add(text);
  };
})(Def);
