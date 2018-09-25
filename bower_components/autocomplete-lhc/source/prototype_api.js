// Contains the subset of PrototypeJS APIs needed by this package, reimplemented
// using jQuery.

// Mostly copied (and modified) from the original PrototypeJS at
// http://prototypejs.org/

if (typeof Def === 'undefined')
  window.Def = {};

Def.PrototypeAPI = function() {
  "use strict";

  var $break = { };

  /**
   *  Constructs and returns an array from the given iterable.
   */
  function $A(iterable) {
    if (!iterable) return [];
    if ('toArray' in Object(iterable)) return iterable.toArray();
    var length = iterable.length || 0, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  }


  /**
   *  Returns the element with the given ID.
   * @param id the ID of the element.
   */
  function $(id) {
    var rtn = id; // "id" might be an element
    if (Def.PrototypeAPI.isString(id))
      rtn = document.getElementById(id);
    return rtn;
  }



  var _toString = Object.prototype.toString;


  var Browser = (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    }
  })();


  /**
   *  Returns true if the given object is a function.
   */
  function isFunction(obj) {
    return _toString.call(obj) === '[object Function]';
  }


  /**
   *  Returns true if the given object is a string.
   */
  function isString(object) {
    return _toString.call(object) === '[object String]';
  }


  /**
   *  Returns true if the given object is an array.
   */
  function isArray(object) {
    return _toString.call(object) === '[object Array]';
  }


  /**
   *  Returns the argument names of the given function.
   * @param f the function
   */
  function functionArgumentNames(f) {
    var names = f.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  /**
   *  Copies properties of source into destination.
   * @return destination
   */
  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }


  /**
   *  An identity function
   * @return the object given.
   */
  function K(a) {
    return a;
  }


  /**
   *  A function for constructing a class.
   */
  var Class = (function() {

    var IS_DONTENUM_BUGGY = (function(){
      for (var p in { toString: 1 }) {
        if (p === 'toString') return false;
      }
      return true;
    })();

    function subclass() {};
    function create() {
      var parent = null, properties = $A(arguments);
      if (isFunction(properties[0]))
        parent = properties.shift();

      function klass() {
        this.initialize.apply(this, arguments);
      }

      extend(klass, Class.Methods);
      klass.superclass = parent;
      klass.subclasses = [];

      if (parent) {
        subclass.prototype = parent.prototype;
        klass.prototype = new subclass;
        parent.subclasses.push(klass);
      }

      for (var i = 0, length = properties.length; i < length; i++)
        klass.addMethods(properties[i]);

      if (!klass.prototype.initialize)
        klass.prototype.initialize = function() {}; // empty function

      klass.prototype.constructor = klass;
      return klass;
    }

    function addMethods(source) {
      var ancestor   = this.superclass && this.superclass.prototype,
          properties = Object.keys(source);

      if (IS_DONTENUM_BUGGY) {
        if (source.toString != Object.prototype.toString)
          properties.push("toString");
        if (source.valueOf != Object.prototype.valueOf)
          properties.push("valueOf");
      }

      for (var i = 0, length = properties.length; i < length; i++) {
        var property = properties[i], value = source[property];
        if (ancestor && isFunction(value) &&
            functionArgumentNames(value)[0] == "$super") {
          var method = value;
          value = (function(m) {
            return function() { return ancestor[m].apply(this, arguments); };
          })(property).wrap(method);

          value.valueOf = (function(method) {
            return function() { return method.valueOf.call(method); };
          })(method);

          value.toString = (function(method) {
            return function() { return method.toString.call(method); };
          })(method);
        }
        this.prototype[property] = value;
      }

      return this;
    }

    return {
      create: create,
      Methods: {
        addMethods: addMethods
      }
    };
  })(); // end of Class


  var Enumerable = (function() {
    function each(iterator, context) {
      try {
        this._each(iterator, context);
      } catch (e) {
        if (e != $break) throw e;
      }
      return this;
    }

    function eachSlice(number, iterator, context) {
      var index = -number, slices = [], array = this.toArray();
      if (number < 1) return array;
      while ((index += number) < array.length)
        slices.push(array.slice(index, index+number));
      return slices.collect(iterator, context);
    }

    function all(iterator, context) {
      iterator = iterator || K;
      var result = true;
      this.each(function(value, index) {
        result = result && !!iterator.call(context, value, index, this);
        if (!result) throw $break;
      }, this);
      return result;
    }

    function any(iterator, context) {
      iterator = iterator || K;
      var result = false;
      this.each(function(value, index) {
        if (result = !!iterator.call(context, value, index, this))
          throw $break;
      }, this);
      return result;
    }

    function collect(iterator, context) {
      iterator = iterator || K;
      var results = [];
      this.each(function(value, index) {
        results.push(iterator.call(context, value, index, this));
      }, this);
      return results;
    }

    function detect(iterator, context) {
      var result;
      this.each(function(value, index) {
        if (iterator.call(context, value, index, this)) {
          result = value;
          throw $break;
        }
      }, this);
      return result;
    }

    function findAll(iterator, context) {
      var results = [];
      this.each(function(value, index) {
        if (iterator.call(context, value, index, this))
          results.push(value);
      }, this);
      return results;
    }

    function grep(filter, iterator, context) {
      iterator = iterator || K;
      var results = [];

      if (Def.PrototypeAPI.isString(filter))
        filter = new RegExp(RegExp.escape(filter));

      this.each(function(value, index) {
        if (filter.match(value))
          results.push(iterator.call(context, value, index, this));
      }, this);
      return results;
    }

    function include(object) {
      if (isFunction(this.indexOf) && this.indexOf(object) != -1)
        return true;

      var found = false;
      this.each(function(value) {
        if (value == object) {
          found = true;
          throw $break;
        }
      });
      return found;
    }

    function inGroupsOf(number, fillWith) {
      fillWith = Object.isUndefined(fillWith) ? null : fillWith;
      return this.eachSlice(number, function(slice) {
        while(slice.length < number) slice.push(fillWith);
        return slice;
      });
    }

    function inject(memo, iterator, context) {
      this.each(function(value, index) {
        memo = iterator.call(context, memo, value, index, this);
      }, this);
      return memo;
    }

    function invoke(method) {
      var args = $A(arguments).slice(1);
      return this.map(function(value) {
        return value[method].apply(value, args);
      });
    }

    function max(iterator, context) {
      iterator = iterator || K;
      var result;
      this.each(function(value, index) {
        value = iterator.call(context, value, index, this);
        if (result == null || value >= result)
          result = value;
      }, this);
      return result;
    }

    function min(iterator, context) {
      iterator = iterator || K;
      var result;
      this.each(function(value, index) {
        value = iterator.call(context, value, index, this);
        if (result == null || value < result)
          result = value;
      }, this);
      return result;
    }

    function partition(iterator, context) {
      iterator = iterator || K;
      var trues = [], falses = [];
      this.each(function(value, index) {
        (iterator.call(context, value, index, this) ?
          trues : falses).push(value);
      }, this);
      return [trues, falses];
    }

    function pluck(property) {
      var results = [];
      this.each(function(value) {
        results.push(value[property]);
      });
      return results;
    }

    function reject(iterator, context) {
      var results = [];
      this.each(function(value, index) {
        if (!iterator.call(context, value, index, this))
          results.push(value);
      }, this);
      return results;
    }

    function sortBy(iterator, context) {
      return this.map(function(value, index) {
        return {
          value: value,
          criteria: iterator.call(context, value, index, this)
        };
      }, this).sort(function(left, right) {
        var a = left.criteria, b = right.criteria;
        return a < b ? -1 : a > b ? 1 : 0;
      }).pluck('value');
    }

    function toArray() {
      return this.map();
    }

    function zip() {
      var args = $A(arguments);
      var collections = [this].concat(args).map($A);
      return this.map(function(value, index) {
        var rtn = [];
        for (var i=0, len=collections.length; i<len; ++i)
          rtn.push(collections[i][index]);
        return rtn;
      });
    }

    function size() {
      return this.toArray().length;
    }

    function inspect() {
      return '#<Enumerable:' + this.toArray().inspect() + '>';
    }

    return {
      each:       each,
      eachSlice:  eachSlice,
      all:        all,
      every:      all,
      any:        any,
      some:       any,
      collect:    collect,
      map:        collect,
      detect:     detect,
      findAll:    findAll,
      select:     findAll,
      filter:     findAll,
      grep:       grep,
      include:    include,
      member:     include,
      inGroupsOf: inGroupsOf,
      inject:     inject,
      invoke:     invoke,
      max:        max,
      min:        min,
      partition:  partition,
      pluck:      pluck,
      reject:     reject,
      sortBy:     sortBy,
      toArray:    toArray,
      entries:    toArray,
      zip:        zip,
      size:       size,
      inspect:    inspect,
      find:       detect
    };
  })();  // End of Enumerable


  /**
   *  A modified toQueryParams that takes the search part of a URL and returns a
   *  hash of the parameters.
   */
  function toQueryParams(search) {
    var separator = '&';
    var match = search.trim().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    var keyValPairs = match[1].split(separator || '&');
    var rtn = {};
    for (var i=0, len=keyValPairs.length; i<len; ++i) {
      var pair = keyValPairs[i];
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) {
          value = value.gsub('+', ' ');
          value = decodeURIComponent(value);
        }

        if (key in hash) {
          if (!this.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
    }
    return rtn;
  }


  /**
   *  Escapes a string for safe use as an HTML attribute.
   * @param val the string to be escaped
   * @return the escaped version of val
   */
  function escapeAttribute(val) {
    // Note:  PrototypeJS' escapeHTML does not escape quotes, and for
    // attributes quotes need to be escaped.
    // JQuery does not provide an API for this at all.
    //   (See:  http://bugs.jquery.com/ticket/11773)
    // Various implementations are benchmarked here:
    //   http://jsperf.com/htmlencoderegex
    // This one is the fastest (at least in Chrome).
    return val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g,
'&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  /* A namespace for the style-related functions */
  var Styles =  {
    /* See PrototypeJS API */
    setOpacity: function(element, value) {
      element = $(element);
      if (value == 1 || value === '') value = '';
      else if (value < 0.00001) value = 0;
      element.style.opacity = value;
      return element;
    },


    /* See PrototypeJS API */
    setStyle: function(element, styles) {
      element = $(element);
      var elementStyle = element.style, match;

      if (Def.PrototypeAPI.isString(styles)) {
        elementStyle.cssText += ';' + styles;
        if (styles.include('opacity')) {
          var opacity = styles.match(/opacity:\s*(\d?\.?\d*)/)[1];
          Def.PrototypeAPI.setOpacity(element, opacity);
        }
        return element;
      }

      for (var property in styles) {
        if (property === 'opacity') {
          Def.PrototypeAPI.setOpacity(element, styles[property]);
        } else {
          var value = styles[property];
          if (property === 'float' || property === 'cssFloat') {
            property = elementStyle.styleFloat === undefined ?
             'cssFloat' : 'styleFloat';
          }
          elementStyle[property] = value;
        }
      }

      return element;
    },


    /* See PrototypeJS API */
    getStyle: function(element, style) {
      element = $(element);
      // style = normalizeStyleName(style);

      var value = element.style[style];
      if (!value || value === 'auto') {
        var css = document.defaultView.getComputedStyle(element, null);
        value = css ? css[style] : null;
      }

      if (style === 'opacity') return value ? parseFloat(value) : 1.0;
      return value === 'auto' ? null : value;
    },


    /**
     *  Stores data about an element

    /* See PrototypeJS API */
    makePositioned: function(element) {
      element = $(element);
      var position = Def.PrototypeAPI.getStyle(element, 'position'), styles = {};
      if (position === 'static' || !position) {
        styles.position = 'relative';
        if (Def.PrototypeAPI.Browser.Opera) {
          styles.top  = 0;
          styles.left = 0;
        }
        Def.PrototypeAPI.setStyle(element, styles);
        jQuery(element).data('prototype_made_positioned', true);
      }
      return element;
    },


    /* See PrototypeJS API */
    undoPositioned: function(element) {
      element = $(element);
      var jqElem = jQuery(element);
      var madePositioned = jqElem.data('prototype_made_positioned');

      if (madePositioned) {
        jqElem.removeData('prototype_made_positioned');
        Def.PrototypeAPI.setStyle(element, {
          position: '',
          top:      '',
          bottom:   '',
          left:     '',
          right:    ''
        });
      }
      return element;
    }

  }; // Styles


  return {
    $: $,
    Class: Class,
    Enumerable: Enumerable,
    isString: isString,
    isArray: isArray,
    Browser: Browser,
    parseQuery: toQueryParams,
    escapeHTML: escapeAttribute,
    escapeAttribute: escapeAttribute,
    getStyle: Styles.getStyle,
    setStyle: Styles.setStyle,
    makePositioned: Styles.makePositioned,
    undoPositioned: Styles.undoPositioned,
    $A: $A
  }
}();
