'use strict';

export function copyToClipboard(elementId) {
  window.getSelection().selectAllChildren(document.getElementById(elementId));
  /* Copy the text inside the element */
  document.execCommand("Copy");
}

