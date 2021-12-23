'use strict';

export function copyToClipboard(elementId) {
  window.getSelection().selectAllChildren(document.getElementById(elementId));
  /* Copy the text inside the element */
  document.execCommand("Copy");
}


/**
 *  Hides an element.
 * @param elem the element to hide.
 */
export function hide(elem) {
  elem.style.display = 'none';
}


/**
 *  Shows an element by setting display to block, unless the second parameter is
 *  provided.
 * @param elem the element to show.
 * @param displaySetting (optional, default 'block') the setting for 'display'
 */
export function show(elem, displaySetting) {
  displaySetting ||= 'block';
  elem.style.display = displaySetting;
}


/**
 *  Toggles the visiblity of the given element by setting display to 'none'
 *  or ''.
 * @return the new display setting
 */
export function toggleDisplay(elem) {
  return elem.style.display = !elem.style.display ? 'none' : '';
}
