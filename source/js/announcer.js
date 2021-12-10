// Exports a function for causing the screen reader to read a message.


/**
 *  If a screen reader is running, this will cause the given message to be read.
 * @param msg the message for the screen reader to read.
 */
export function announce(msg) {
  LForms.Def.Autocompleter.screenReaderLog(msg);
};
