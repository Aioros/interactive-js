const VO = require("./vo.js");
const Identifier = require("./lib/identifier.js");

const Scope = {
  init: function(engine) {
    this.Engine = engine;
  },
  define: function(name, type, value) {
    var context = this.Engine.getCurrentContext();
    // function declarations can be overridden, duplicate var declarations are ignored
    if (type == "function" || !context.VO.hasIdentifier(name))
      context.VO.setIdentifier(name, Identifier(value, type));
  },
  findIdentifier: function(identifier) {
    var context = this.Engine.getCurrentContext();
    // Look for the variable in the scope chain
    var s = 0;
    while (s < context.ScopeChain.length && !context.ScopeChain[s].hasIdentifier(identifier))
      s++;
    if (s < context.ScopeChain.length) {
      // Found it
      return context.ScopeChain[s].getIdentifier(identifier);
    } else {
      throw new ReferenceError(identifier + " is not defined");
    }
  },
  pushBlockScope: function() {
    var context = this.Engine.getCurrentContext();
    context.ScopeChain = [VO(), ...context.ScopeChain];
    context.VO = context.ScopeChain[0];
  },
  popBlockScope: function() {
    var context = this.Engine.getCurrentContext();
    context.ScopeChain = context.ScopeChain.slice(1);
    context.VO = context.ScopeChain[0];
  }
};

module.exports = Scope;