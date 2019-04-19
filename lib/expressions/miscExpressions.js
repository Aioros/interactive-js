const ExpValue = require("../expValue.js");

module.exports = [

  {
    type: "Literal",
    value: null,
    evaluate: async function() {
      return ExpValue(this.value);
    }
  },

  {
    type: "Identifier",
    name: null,
    evaluate: async function() {
      var identifier = this.Engine.Scope.findIdentifier(this.name);
      return ExpValue(identifier.value);
    }
  },

  {
    type: "SpreadElement",
    argument: null,
    evaluate: async function() {
      var result = [];
      var argument = (await this.Engine.process(this.argument)).unwrap();
      for (let v of argument)
        result.push(v);
      return ExpValue(result);
    }
  },

  {
    type: ["ArrayExpression", "ArrayPattern"],
    elements: [],
    evaluate: async function() {
      var SandboxArray = this.Engine.Scope.findIdentifier("Array").value;
      var result = new SandboxArray(0);
      for (let el of this.elements) {
        result.push((await this.Engine.process(el)).unwrap());
      }
      return ExpValue(result);
    }
  },

  {
    type: ["ObjectExpression", "ObjectPattern"],
    properties: [],
    evaluate: async function() {
      var obj = {};
      for (let prop of this.properties) {
        obj[prop.key.name] = (await this.Engine.process(prop.value)).unwrap();
      }
      return ExpValue(obj);
    }
  },
  
  {
    type: ["MemberExpression", "StaticMemberExpression"],
    evaluate: async function() {
      let mExpInfo = await this.Engine.findMemberExpression(this);
      return ExpValue(mExpInfo.getValue());
    }
  },
  
  {
    type: "SequenceExpression",
    evaluate: async function() {
      var result;
      for (var e=0; e<this.expressions.length; e++) {
        result = (await this.Engine.process(this.expressions[e])).unwrap();
      }
      return ExpValue(result);
    }
  },

  {
    type: "ThisExpression",
    evaluate: async function() {
      var thisIdentifier = this.Engine.Scope.findIdentifier("this");
      return ExpValue(thisIdentifier.value);
    }
  },

  {
    type: "YieldExpression",
    evaluate: async function() {
      // We know we are in a generator
      // Retrieve the function we're executing
      var f = this.Engine.getCurrentContext().f;
      var self = this;
      var argument = (await self.Engine.process(self.argument)).unwrap();
      var resume;
      if (!this.delegate) {
        // Regular yield
        // Hold evaluation by returning a promise that the iterator will resolve
        resume = new Promise((resolve, reject) => {
          // Expose a .resume() and a .throw() function
          // Used by .next() and .throw() in genIterator.js
          f.resume = function(v) {
            resolve(ExpValue(v));
          };
          f.throw = function(err) {
            reject(err);
          }
        });
        // Yield to the iterator
        // Resolves a promise set by .next() in genIterator.js
        f.yield(argument);
      } else {
        // Delegate to other iterator
        // Hold evaluation by returning a promise that will be resolved when the delegate is done 
        resume = new Promise((resolve, reject) => {
          f.resume = async function(v) {
            // Pass the call to the delegate
            delegateResult = await argument.next(v);
            if (!delegateResult.done) {
              // Delegate still going, yield this to the iterator
              f.yield(delegateResult.value);
            } else {
              // Delegate result becomes the result of the yield expression
              resolve(delegateResult.value);
            }
          };
          f.throw = function(err) {
            reject(err);
          }
        });
        // Call first resume (first .next() of the delegate iterator)
        await f.resume();
      }
      return resume;
    }
  }

];