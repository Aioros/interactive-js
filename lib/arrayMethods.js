const _Array = Array;

module.exports = function(Array) {
  return Object.assign(Array.prototype, {

    every: async function(callbackfn, thisArg) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every#Polyfill
      var T, k;
      if (this == null) {
        throw new TypeError('this is null or not defined');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      var isInteractiveFunction = (callbackfn && callbackfn[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof callbackfn !== 'function' && !isInteractiveFunction) {
        throw new TypeError();
      }
      if (arguments.length > 1) {
        T = thisArg;
      }
      k = 0;
      while (k < len) {
        var kValue;
        if (k in O) {
          kValue = O[k];
          var testResult;
          if (isInteractiveFunction)
            testResult = (await callbackfn.call(T, kValue, k, O)).value;
          else
            testResult = callbackfn.call(T, kValue, k, O);
          if (!testResult) {
            return false;
          }
        }
        k++;
      }
      return true;
    },

    filter: async function(func, thisArg) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter#Polyfill
      var isInteractiveFunction = (func && func[Symbol.toStringTag] == "InteractiveFunction");
      if ( ! ((typeof func === 'function' || isInteractiveFunction) && this) )
        throw new TypeError();
      var len = this.length >>> 0,
          res = new Array(len),
          t = this, c = 0, i = -1;
      if (thisArg === undefined) {
        while (++i !== len) {
          if (i in this) {
            var value;
            if (isInteractiveFunction)
              value = (await func.call(null, t[i], i, t)).value
            else
              value = func(t[i], i, t);
            if (value) {
              res[c++] = t[i];
            }
          }
        }
      } else {
        while (++i !== len) {
          if (i in this) {
            var value;
            if (isInteractiveFunction)
              value = (await func.call(thisArg, t[i], i, t)).value
            else
              value = func.call(thisArg, t[i], i, t);
            if (value) {
              res[c++] = t[i];
            }
          }
        }
      }
      res.length = c;
      return res;
    },

    find: async function(predicate, findIndex = false) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#Polyfill
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex#Polyfill
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      var isInteractiveFunction = (predicate && predicate[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof predicate !== 'function' && !isInteractiveFunction) {
        throw new TypeError('predicate must be a function');
      }
      var thisArg = arguments[1];
      var k = 0;
      while (k < len) {
        var kValue = o[k];
        var test;
        if (isInteractiveFunction)
          test = (await predicate.call(thisArg, kValue, k, o)).value;
        else
          test = predicate.call(thisArg, kValue, k, o);
        if (test) {
          return (findIndex ? k : kValue);
        }
        k++;
      }
      return (findIndex ? -1 : undefined);
    },

    findIndex: async function(predicate) {
      return this.find(predicate, true);
    },

    forEach: async function(callback/*, thisArg*/) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach#Polyfill
      var T, k;
      if (this == null) {
        throw new TypeError('this is null or not defined');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      var isInteractiveFunction = (callback && callback[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof callback !== 'function' && !isInteractiveFunction) {
        throw new TypeError(callback + ' is not a function');
      }
      if (arguments.length > 1) {
        T = arguments[1];
      }
      k = 0;
      while (k < len) {
        var kValue;      
        if (k in O) {
          kValue = O[k];
          await callback.call(T, kValue, k, O);
        }
        k++;
      }
    },

    map: async function(callback/*, thisArg*/) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map#Polyfill
      var T, A, k;
      if (this == null) {
        throw new TypeError('this is null or not defined');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      var isInteractiveFunction = (callback && callback[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof callback !== 'function' && !isInteractiveFunction) {
        throw new TypeError(callback + ' is not a function');
      }
      if (arguments.length > 1) {
        T = arguments[1];
      }
      A = new Array(len);
      k = 0;
      while (k < len) {
        var kValue, mappedValue;
        if (k in O) {
          kValue = O[k];
          if (isInteractiveFunction)
            mappedValue = (await callback.call(T, kValue, k, O)).value;
          else
            mappedValue = callback.call(T, kValue, k, O);
          A[k] = mappedValue;
        }
        k++;
      }
      return A;
    },

    reduce: async function(callback /*, initialValue*/) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce#Polyfill
      if (this === null) {
        throw new TypeError( 'Array.prototype.reduce called on null or undefined' );
      }
      var isInteractiveFunction = (callback && callback[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof callback !== 'function' && !isInteractiveFunction) {
        throw new TypeError( callback + ' is not a function');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      var k = 0; 
      var value;
      if (arguments.length >= 2) {
        value = arguments[1];
      } else {
        while (k < len && !(k in o)) {
          k++; 
        }
        if (k >= len) {
          throw new TypeError( 'Reduce of empty array with no initial value' );
        }
        value = o[k++];
      }
      while (k < len) {
        if (k in o) {
          if (isInteractiveFunction)
            value = (await callback.call(null, value, o[k], k, o)).value;
          else
            value = callback(value, o[k], k, o);
        }    
        k++;
      }
      return value;
    },

    reduceRight: async function(callback /*, initialValue*/) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight#Polyfill
      if (null === this || 'undefined' === typeof this) {
        throw new TypeError('Array.prototype.reduce called on null or undefined');
      }
      var isInteractiveFunction = (callback && callback[Symbol.toStringTag] == "InteractiveFunction");
      if ('function' !== typeof callback && !isInteractiveFunction) {
        throw new TypeError(callback + ' is not a function');
      }
      var t = Object(this), len = t.length >>> 0, k = len - 1, value;
      if (arguments.length >= 2) {
        value = arguments[1];
      } else {
        while (k >= 0 && !(k in t)) {
          k--;
        }
        if (k < 0) {
          throw new TypeError('Reduce of empty array with no initial value');
        }
        value = t[k--];
      }
      for (; k >= 0; k--) {
        if (k in t) {
          if (isInteractiveFunction)
            value = (await callback.call(null, value, t[k], k, t)).value;
          else
            value = callback(value, t[k], k, t);
        }
      }
      return value;
    },

    some: async function(fun, thisArg) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some#Polyfill
      if (this == null) {
        throw new TypeError('Array.prototype.some called on null or undefined');
      }
      var isInteractiveFunction = (fun && fun[Symbol.toStringTag] == "InteractiveFunction");
      if (typeof fun !== 'function' && !isInteractiveFunction) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var test;
          if (isInteractiveFunction)
            test = (await fun.call(thisArg, t[i], i, t)).value;
          else
            test = fun.call(thisArg, t[i], i, t);
          if (test) {
            return true;
          }
        }
      }
      return false;
    },

    sort: async function(compareFunction) {
      // yeah, NO WAY I'm actually polyfilling this one
      var isInteractiveFunction = (compareFunction && compareFunction[Symbol.toStringTag] == "InteractiveFunction");
      if (!isInteractiveFunction) {
        return _Array.prototype.sort.call(this, compareFunction);
      } else {
        // I'll just go with a mergesort and we'll be fine
        async function mergeSort(arr) {
          if (arr.length < 2)
            return arr;
          var middle = parseInt(arr.length / 2);
          var left = arr.slice(0, middle);
          var right = arr.slice(middle, arr.length);
          return await merge(await mergeSort(left), await mergeSort(right));
        }
        async function merge(left, right) {
          var result = [];
          while (left.length && right.length) {
            var test = (await compareFunction.call(null, left[0], right[0])).value;
            if (test > 0) {
              result.push(left.shift());
            } else {
              result.push(right.shift());
            }
          }
          while (left.length)
            result.push(left.shift());
          while (right.length)
            result.push(right.shift());
          return result;
        }
        var result = await mergeSort(this);
        return result;
      }
    }

  });
}