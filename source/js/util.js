'use strict';

export function copyToClipboard(elementId) {
  window.getSelection().selectAllChildren(document.getElementById(elementId));
  /* Copy the text inside the element */
  document.execCommand("Copy");
}

/**
 *  Sends a message for a screen reader to reader.
 * @msg the message to read
 */
export function announce(msg) {
  LForms.Def.ScreenReaderLog.add(msg);
};
