/*! 
  Weirdly based on:
    Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
// Mr. Simpson I'm really sorry

const ExpValue = require("./expValue.js");

module.exports = function(asyncApis) {

  var {setTimeout, setImmediate} = asyncApis;

  function isFunction(fn) {
    if (!fn) return false;
    if (typeof fn == "function") {
      return "function";
    } else if (fn[Symbol.toStringTag] == "InteractiveFunction") {
      return "InteractiveFunction";
    } else {
      return false;
    }
  }

  var builtInProp, cycle, scheduling_queue,
      ToString = Object.prototype.toString,
      timer = (typeof setImmediate != "undefined") ? function timer(fn) { return setImmediate(fn); } : setTimeout
  ;

  builtInProp = function builtInProp(obj, name, val, config) {
    return Object.defineProperty(obj, name, {
      value: val,
      writable: true,
      configurable: config !== false
    });
  };

  // Note: using a queue instead of array for efficiency
  scheduling_queue = (function Queue() {
    var first, last, item;

    function Item(fn, self) {
      this.fn = fn;
      this.self = self;
      this.next = void 0;
    }

    return {
      add: function add(fn, self) {
        item = new Item(fn, self);
        if (last) {
          last.next = item;
        }
        else {
          first = item;
        }
        last = item;
        item = void 0;
      },
      drain: async function drain() {
        var f = first;
        first = last = cycle = void 0;

        while (f) {
          await f.fn.call(f.self);
          f = f.next;
        }
      }
    };
  })();

  function schedule(fn, self) {
    scheduling_queue.add(fn, self);
    if (!cycle) {
      cycle = timer(async () => {
        await scheduling_queue.drain();
      });
    }
  }

  // promise duck typing
  function isThenable(o) {
    var _then, o_type = typeof o;

    if (o != null &&
      (
        o_type == "object" || o_type == "function"
      )
    ) {
      _then = o.then;
    }
    return typeof _then == "function" ? _then : false;
  }

  async function notify() {
    for (var i=0; i<this.chain.length; i++) {
      await notifyIsolated(
        this,
        (this.state === 1) ? this.chain[i].success : this.chain[i].failure,
        this.chain[i]
      );
    }
    this.chain.length = 0;
  }

  // NOTE: This is a separate function to isolate
  // the `try..catch` so that other code can be
  // optimized better
  async function notifyIsolated(self, cb, chain) {
    var ret, _then;
    try {
      if (cb === false) {
        chain.reject(self.msg);
      }
      else {
        if (cb === true) {
          ret = self.msg;
        }
        else {
          ret = await cb.call(void 0, self.msg);
        }

        if (ret === chain.promise) {
          chain.reject(TypeError("Promise-chain cycle"));
        }
        else if (_then = isThenable(ret)) {
          await _then.call(ret, chain.resolve, chain.reject);
        }
        else {
          chain.resolve(ret);
        }
      }
    }
    catch (err) {
      chain.reject(err);
    }
  }

  function resolve(msg) {
    var _then, self = this;
    self.promise.__MSG__ = msg.unwrap ? msg.unwrap() : msg;
    // already triggered?
    if (self.triggered) { return; }

    self.triggered = true;

    // unwrap
    if (self.def) {
      self = self.def;
    }

    try {
      if (_then = isThenable(msg)) {
        schedule(function(){
          var def_wrapper = new MakeDefWrapper(self);
          try {
            _then.call(msg,
              function $resolve$(){ resolve.apply(def_wrapper, arguments); },
              function $reject$(){ reject.apply(def_wrapper, arguments); }
            );
          }
          catch (err) {
            reject.call(def_wrapper, err);
          }
        })
      }
      else {
        self.msg = msg;
        self.state = 1;
        if (self.chain.length > 0) {
          schedule(notify, self);
        }
      }
    }
    catch (err) {
      reject.call(new MakeDefWrapper(self), err);
    }
  }

  function reject(msg) {
    var self = this;

    // already triggered?
    if (self.triggered) { return; }

    self.triggered = true;

    // unwrap
    if (self.def) {
      self = self.def;
    }

    self.msg = msg;
    self.state = 2;
    if (self.chain.length > 0) {
      schedule(notify, self);
    }
  }

  function iteratePromises(Constructor, arr, resolver, rejecter) {
    for (var idx=0; idx<arr.length; idx++) {
      (function IIFE(idx){
        Constructor.resolve(arr[idx])
          .then(
          function $resolver$(msg){
            resolver(idx, msg);
          },
          rejecter
        );
      })(idx);
    }
  }

  function MakeDefWrapper(self) {
    this.def = self;
    this.triggered = false;
  }

  function MakeDef(self) {
    this.promise = self;
    this.state = 0;
    this.triggered = false;
    this.chain = [];
    this.msg = void 0;
  }

  async function InteractivePromise(executor) {
    if (!isFunction(executor)) {
      throw TypeError("Not a function");
    }

    if (this.__NPO__ !== 0) {
      throw TypeError("Not a promise");
    }

    // instance shadowing the inherited "brand"
    // to signal an already "initialized" promise
    this.__NPO__ = 1;

    var def = new MakeDef(this);

    this["then"] = async function then(success, failure) {
      var o = {
        success: isFunction(success) ? success : true,
        failure: isFunction(failure) ? failure : false
      };
      // Note: `then(..)` itself can be borrowed to be used against
      // a different promise constructor for making the chained promise,
      // by substituting a different `this` binding.
      let newP = Object.create(InteractivePromisePrototype);
      let result = (await this.constructor.call(newP, function extractChain(resolve, reject) {
        if (!isFunction(resolve) || !isFunction(reject)) {
          throw TypeError("Not a function");
        }

        o.resolve = resolve;
        o.reject = reject;
      }));
      if (result)
        o.promise = result;
      else
        o.promise = newP;

      def.chain.push(o);

      if (def.state !== 0) {
        schedule(notify, def);
      }

      return ExpValue(o.promise);
    };
    this["catch"] = function $catch$(failure) {
      return this.then(void 0, failure);
    };

    try {
      await executor.call(
        void 0,
        function publicResolve(msg){
          resolve.call(def, msg);
        },
        function publicReject(msg) {
          reject.call(def, msg);
        }
      );
    }
    catch (err) {
      await reject.call(def, err);
    }
  }

  var InteractivePromisePrototype = builtInProp({}, "constructor", InteractivePromise,
    /*configurable=*/false
  );

  // Note: Android 4 cannot use `Object.defineProperty(..)` here
  InteractivePromise.prototype = InteractivePromisePrototype;

  // built-in "brand" to signal an "uninitialized" promise
  builtInProp(InteractivePromisePrototype, "__NPO__", 0,
    /*configurable=*/false
  );

  builtInProp(InteractivePromise, "resolve", function Promise$resolve(msg) {
    var Constructor = this;

    // spec mandated checks
    // note: best "isPromise" check that's practical for now
    if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
      return msg;
    }

    return new Constructor(function executor(resolve, reject){
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      resolve(msg);
    });
  });

  builtInProp(InteractivePromise, "reject", function Promise$reject(msg) {
    return new this(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      reject(msg);
    });
  });

  builtInProp(InteractivePromise, "all", function Promise$all(arr) {
    var Constructor = this;

    // spec mandated checks
    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }
    if (arr.length === 0) {
      return Constructor.resolve([]);
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      var len = arr.length, msgs = Array(len), count = 0;

      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        msgs[idx] = msg;
        if (++count === len) {
          resolve(msgs);
        }
      }, reject);
    });
  });

  builtInProp(InteractivePromise, "race", function Promise$race(arr) {
    var Constructor = this;

    // spec mandated checks
    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        resolve(msg);
      }, reject);
    });
  });

  return InteractivePromise;

}
