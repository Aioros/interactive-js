const GenIterator = function GenIterator(f, args, fThis) {
  // Create a copy of the original function tree
  var _f = Object.assign({}, f, {generator: false});
  // Create a new context for _f, will have the same scope chain
  _f.context = f.context.cloneFor(_f);
  return {
    _f: _f,
    status: "start",
    next: async function(v) {
      var self = this;
      if (self.status == "start") {
        // This is the first time .next() is called
        // Create and store a promise that follows the execution of the function
        _f.mainExecutionPromise = new Promise((resolve, reject) => {
          self.status = "executing";
          return _f.call(fThis, ...args)
            .then(executionResult => {
              // Function returned
              self.status = "completed";
              resolve(executionResult);
            });
        });
      }
      // Create a promise that can be resolved by a yield expression
      var resolvableByYield = new Promise((resolve, reject) => {
        // Expose the resolve() as a .yield() function
        // Used by YieldExpression in miscExpression.js
        _f.yield = resolve;
      });
      if (_f.resume) {
        // Set by YieldExpression in miscExpression.js
        // Resumes execution resolving the YieldExpression .evaluate()
        _f.resume(v);
      }
      // We wait for either a yield or function completion
      return Promise.race([resolvableByYield, _f.mainExecutionPromise])
        .then(result => {
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
    }
  };
};

module.exports = GenIterator;