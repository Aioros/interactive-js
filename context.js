// Execution Context object
const Context = {
  init: function(name) {
    this.name = name;
	  this.VO = {};
    this.ScopeChain = [this.VO];
  }
};

module.exports = Context;