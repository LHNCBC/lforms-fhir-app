// Needed polyfills.

// Object.assign
// From
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}


// String.trimLeft
// There is no standard yet for trimLeft, so to ensure consistent behavior, I am
// ignoring the trimLeft implemented in Chrome and Firefox (which could behave
// differently).
String.prototype.trimLeft = function() {
  // From:  http://stackoverflow.com/a/1593909/360782
  var start = -1;
  while( this.charCodeAt(++start) < 33 );
  return this.slice( start, this.length);
};
