// Based on:  https://github.com/kangax/protolicious/blob/5b56fdafcd7d7662c9d648534225039b2e78e371/event.simulate.js
// (MIT License)

/**
 * Event.simulate(@element, eventName[, options]) -> Element
 *
 * - @element: element to fire event on
 * - eventName: name of event to fire (only MouseEvents and HTMLEvents interfaces are supported)
 * - options: optional object to fine-tune event properties - pointerX, pointerY, ctrlKey, etc.
 *
 *    $('foo').simulate('click'); // => fires "click" event on an element with id=foo
 *
 **/
(function($, Def){
  "use strict";

  var eventMatchers = {
    'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
    'MouseEvents': /^(?:click|mouse(?:down|up|over|move|out))$/
  }
  var defaultOptions = {
    pointerX: 0,
    pointerY: 0,
    button: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true
  }

  Def.Event = {};
  Def.Event.simulate = function(element, eventName) {
    var options = jQuery.extend(defaultOptions, arguments[2] || { });
    var oEvent, eventType = null;

    element = $(element);

    for (var name in eventMatchers) {
      if (eventMatchers[name].test(eventName)) { eventType = name; break; }
    }

    if (!eventType)
      throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

    if (document.createEvent) {
      oEvent = document.createEvent(eventType);
      if (eventType == 'HTMLEvents') {
        oEvent.initEvent(eventName, options.bubbles, options.cancelable);
      }
      else {
        oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
          options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
          options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
      }
      element.dispatchEvent(oEvent);
    }
    else {
      options.clientX = options.pointerX;
      options.clientY = options.pointerY;
      oEvent = jQuery.extend(document.createEventObject(), options);
      element.fireEvent('on' + eventName, oEvent);
    }
    return element;
  }

})(Def.PrototypeAPI.$, Def)
