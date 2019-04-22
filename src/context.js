const VO = require("./vo.js");

// Execution Context object
const Context = {
  init: function(f, parentContext) {
    this.name = f.id ? f.id.name : null;
    this.f = f;
    this.parentContext = parentContext;
	  this.VO = VO();
    this.ScopeChain = [this.VO];
    if (parentContext)
      this.ScopeChain = this.ScopeChain.concat(parentContext.ScopeChain);
  },
  cloneFor: function(newF) {
    var newContext = Object.assign({}, this, {
      f: newF,
      VO: VO()
    });
    newContext.ScopeChain = [newContext.VO].concat(newContext.parentContext.ScopeChain);
    return newContext;
  }
};

module.exports = Context;