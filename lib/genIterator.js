const util = require("util");

const GenIterator = function GenIterator(f, args, fThis) {
  // Create a cleaned-up copy of the original function tree
  var _f = Object.assign({}, f, {generator: false});
  // Create a new context for _f, will have the same scope chain
  _f.context = f.context.cloneFor(_f);
  return {
    _f: _f,
    status: "start",

    _next: async function(v, type="normal") {
      var self = this;
      if (self.status == "start") {
        // This is the first time .next() is called
        // Create and store a promise that follows the execution of the function
        _f.mainExecutionPromise = new Promise((resolve, reject) => {
          self.status = "executing";
          _f.Engine.callStack.push(_f.context);
          if (type == "throw") {
            // We inject a throw statement at the beginning
            let throwStatement = {
              type: "ThrowStatement",
              argument: v
            };
            _f.body.body = [throwStatement, ..._f.body.body];
          }
          return _f.Engine.processFunction(_f, args, fThis)
            .then(completion => {
              // Function returned
              if (completion.type == "error") {
                reject(completion.getCompletionValue());
              } else {
                self.status = "completed";
                resolve(completion.getReturnValue());
              }
            });
        });
      }
      // Create a promise that can be resolved by a yield expression
      var resolvableByYield = new Promise((resolve, reject) => {
        // Expose the resolve() as a .yield() function
        // Used by YieldExpression in miscExpression.js
        _f.yield = resolve;
      });
      if (self.status == "suspended") {
        _f.Engine.callStack.push(_f.context);
        // Set by YieldExpression in miscExpression.js
        // Resume execution resolving or rejecting the YieldExpression .evaluate()
        if (type == "throw") {
          _f.throw(v);
        } else {
          _f.resume(v);
        }
      }
      // We wait for either a yield or function completion
      return Promise.race([resolvableByYield, _f.mainExecutionPromise])
        .then(result => {
          _f.Engine.callStack.pop();
          if (self.status == "completed") {
            return {
              value: result,
              done: true
            }
          } else {
            self.status = "suspended";
            return {
              value: result,
              done: false
            };
          }
        });
    },

    next: async function(v) {
      return this._next(v);
    },

    return: async function(v) {
      this.status = "completed";
      return {
        value: v,
        done: true
      }
    },

    throw: async function(err) {
      return await this._next(err, "throw");
    },

    [Symbol.toStringTag]: "Iterator",
    [util.inspect.custom]: function() {
      return "[" + _f.context.name + ": " + this.status + "]";
    }

  };
};

module.exports = GenIterator;