const vm = require("vm");
const Identifier = require("./lib/identifier.js");

function VO() {
  return {
    vars: {},
    hasIdentifier: function(id) {
      if (!vm.isContext(this.vars)) {
        return this.vars.hasOwnProperty(id);
      } else {
        return vm.runInContext("'" + id + "' in this", this.vars);
      }
    },
    getIdentifier: function(id) {
      if (!vm.isContext(this.vars)) {
        return this.vars[id];
      } else {
        return Identifier(vm.runInContext(id, this.vars));
      }
    },
    setIdentifier: function(id, v) {
      if (!vm.isContext(this.vars)) {
        this.vars[id] = v;
      } else {
        this.vars[id] = v;
      }
    }
  }
}
/*
const VO = {
  vars: {},
  hasIdentifier: function(id) {
    if (!vm.isContext(this.vars)) {
      return this.vars.hasOwnProperty(id);
    } else {
      return vm.runInContext("'" + id + "' in this", this.vars);
    }
  },
  getIdentifier: function(id) {
    if (!vm.isContext(this.vars)) {
      return this.vars[id];
    } else {
      return Identifier(vm.runInContext(id, this.vars));
    }
  },
  setIdentifier: function(id, v) {
    if (!vm.isContext(this.vars)) {
      this.vars[id] = v;
    } else {
      this.vars[id] = v;
    }
  }
}*/

module.exports = VO;