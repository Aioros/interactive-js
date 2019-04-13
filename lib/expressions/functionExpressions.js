const util = require("util");
const ExpValue = require("../expValue.js");

module.exports = {
  type: ["FunctionExpression", "ArrowFunctionExpression"],
  prototype: {},
  evaluate: async function() {
    this.Engine.createFunctionContext(this);
    return ExpValue(this);
  },
  apply: async function(fThis, args) {
    return (await this.Engine.callFunction(this, args, fThis)).getReturnValue();
  },
  call: async function(fThis, ...args) {
    var result = (await this.Engine.callFunction(this, args, fThis)).getReturnValue();
    return result;
  },
  bind: function(fThis) {
    // We create a function that returns an apply, similar to this:
    //  function bind(fn, obj) {
    //    return function() { // <-- this function is what we're going to create and return here
    //      return fn.apply( obj, arguments );
    //    };
    //  }
    var boundFunction = {
      type: "FunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: [
          {
            type: "ReturnStatement",
            argument: {
              type: "CallExpression",
              arguments: [fThis, {type: "Identifier", name: "arguments"}],
              callee: {
                type: "MemberExpression",
                object: this,
                property: {
                  type: "Identifier",
                  name: "apply"
                }
              }
            }
          }
        ]
      }
    }
    return this.Engine.Compiler.setupNode(boundFunction);
  },
  [Symbol.toStringTag]: "InteractiveFunction",
  [util.inspect.custom]: function() {
    return "[object InteractiveFunction]";
  }
};