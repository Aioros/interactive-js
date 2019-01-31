module.exports = {
  type: "CallExpression",
  evaluate: async function() {
    if (this.callee.type == "Identifier") {
      try {
        var callee = this.Engine.Scope.findIdentifier(this.callee.name);
      } catch (e) {
        throw e;
      }
    } else if (this.callee.type == "MemberExpression") {
      var callee = await this.Engine.process(this.callee);
    }
    if (typeof callee === "function") {
      let args = [];
      for (let a of this.arguments) {
        args.push(await this.Engine.process(a));
      }
      return callee.apply(callee.bind, args);
    } else {
      let args = this.arguments.reduce((acc, arg) => {
        if (arg.type == "SpreadElement") {
          return acc.concat(arg.argument.elements);
        }
        return acc.concat(arg);
      }, []);
      return await this.Engine.callFunction(callee.value, args);
    }
  }
};