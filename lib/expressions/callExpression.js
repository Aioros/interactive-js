module.exports = {
  type: "CallExpression",
  evaluate: function() {
    if (this.callee.type == "Identifier") {
      try {
        var callee = this.Engine.Scope.findIdentifier(this.callee.name);
      } catch (e) {
        throw e;
      }
    } else if (this.callee.type == "MemberExpression") {
      var callee = this.Engine.process(this.callee);
    }
    if (typeof callee === "function") {
      let args = this.arguments.map(a => { return this.Engine.process(a); });
      return callee.apply(callee.bind, args);
    } else {
      let args = this.arguments.reduce((acc, arg) => {
        if (arg.type == "SpreadElement") {
          return acc.concat(arg.argument.elements);
        }
        return acc.concat(arg);
      }, []);
      return this.Engine.callFunction(callee.value, args);
    }
  }
};