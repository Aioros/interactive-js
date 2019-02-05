module.exports = {
  type: "CallExpression",
  evaluate: async function() {
    var callee, fThis;
    if (this.callee.type == "Identifier") {
      callee = this.Engine.Scope.findIdentifier(this.callee.name);
      fThis = null;
    } else if (this.callee.type == "MemberExpression") {
      callee = await this.Engine.process(this.callee);
      fThis = this.callee.object;
    }
    if (typeof callee === "function") {
      // this is an actual function, either external or one of our .apply's, .call's, or .bind's
      // we basically execute them as they are
      let args = [];
      for (let a of this.arguments) {
        args.push(await this.Engine.process(a));
      }
      return await callee.apply(await this.Engine.process(fThis), args);
    } else {
      // this is a function that we're managing
      let args = this.arguments.reduce((acc, arg) => {
        if (arg.type == "SpreadElement") {
          return acc.concat(arg.argument.elements);
        }
        return acc.concat(arg);
      }, []);
      if (callee.value) {
        return await this.Engine.callFunction(callee.value, args, fThis);
      } else {
        return await this.Engine.callFunction(callee, args, fThis);
      }
    }
  }
};