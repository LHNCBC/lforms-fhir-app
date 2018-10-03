if (typeof Def === 'undefined')
  window.Def = {};

// Wrap the definitions in a function to protect our version of global variables
(function($, jQuery, Def) {
  "use strict";

  Def.FieldAlarms = {
    /**
     * Sets off an alarm with few shakes and a "bonk" sound
     *
     * @param field a field which should be shaked when the alarm is setoff
     **/
    setOffAlarm: function(field) {
      if (this.bonk === undefined)
        this.bonk = new Audio(this.soundData_);  // see bonk.js for soundData_
      // Reset the play position back the the beginning, if the sound has
      // been loaded sufficiently.
      if (this.bonk.readyState >= 2) {
        this.bonk.currentTime = 0; // now the sound can be replayed
        if (this.bonk.currentTime !== 0) {
          // Work around Chrome bug.  However, this bug really
          // has to do with the server not setting the Accept-Ranges
          // and Content-Range headers on the response.  The drawback
          // of this workaround is that it will trigger a reload
          // of the sound file (so it is better to adjust your server's
          // configuration if you are having that problem).
          this.bonk.src = this.bonk.src; // should reset the time to 0
        }
      }
      this.bonk.play();
      Def.Effect.Shake(field.id, 5);
    }, // end of setOffAlarm

    /**
     *  Cancels the alarm.
     */
    cancelAlarm: function(field) {
      field.shakeCanceled = true;
      this.bonk.pause();
      this.bonk.currentTime = 0;
    }
  };
})(Def.PrototypeAPI.$, jQuery, Def);
