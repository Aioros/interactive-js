const Scope = {
  init: function(engine) {
    this.Engine = engine;
  },
  define: function(name, type, value) {
    var context = this.Engine.getCurrentContext();
    // function declarations can be overridden, duplicate var declarations are ignored
    if (type == "function" || !context.VO.hasOwnProperty(name))
      context.VO[name] = {type, value};
  },
  findIdentifier: function(identifier) {
    var context = this.Engine.getCurrentContext();
    // Look for the variable in the scope chain
    var s = 0;
    while (s < context.ScopeChain.length && !context.ScopeChain[s].hasOwnProperty(identifier))
      s++;
    if (s < context.ScopeChain.length) {
      // Found it
      return context.ScopeChain[s][identifier];
    } else {
      // Maybe it's a (true) global object?
      var realGlobal = (1,eval)("this");
      if (realGlobal[identifier])
        return {value: realGlobal[identifier], bind: realGlobal};
      else
        throw new ReferenceError(identifier + " is not defined");
    }
  },
  pushBlockScope: function() {
    var context = this.Engine.getCurrentContext();
    context.ScopeChain = [{}, ...context.ScopeChain];
    context.VO = context.ScopeChain[0];
  },
  popBlockScope: function() {
    var context = this.Engine.getCurrentContext();
    context.ScopeChain = context.ScopeChain.slice(1);
    context.VO = context.ScopeChain[0];
  }
};

module.exports = Scope;