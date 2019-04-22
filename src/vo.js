const vm = require("vm");
const Identifier = require("./lib/identifier.js");

function VO() {
  return {
    vars: {},
    hasIdentifier: function(id) {
      if (!this.isSandbox) {
        return this.vars.hasOwnProperty(id);
      } else {
        try {
          vm.runInContext(id + ";", this.vars);
          return true;
        } catch (refError) {
          return false;
        }
      }
    },
    getIdentifier: function(id) {
      if (!this.isSandbox) {
        return this.vars[id];
      } else {
        return Identifier(vm.runInContext(id, this.vars));
      }
    },
    setIdentifier: function(id, v) {
      if (!this.isSandbox) {
        this.vars[id] = v;
      } else {
        this.vars[id] = v;
      }
    }
  }
}

module.exports = VO;