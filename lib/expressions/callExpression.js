module.exports = [
  {
    type: ["CallExpression", "NewExpression"],
    evaluate: async function() {
      var callee, fThis = null, result;
      if (this.callee.type == "Identifier") {
        callee = this.Engine.Scope.findIdentifier(this.callee.name);
      } else if (this.callee.type == "MemberExpression") {
        callee = await this.Engine.process(this.callee);
        if (callee.type != "ArrowFunctionExpression")
          fThis = this.callee.object;
      }
      if (callee.value)
        callee = callee.value;
      if (this.type == "NewExpression") {
        fThis = Object.create(callee.prototype);
      }
      if (typeof callee === "function") {
        // this is an actual function, either external or one of our .apply's, .call's, or .bind's
        // we basically execute them as they are
        let args = [];
        for (let a of this.arguments) {
          args = args.concat((await this.Engine.process(a)).value);
        }
        result = await callee.apply((await this.Engine.process(fThis)).value, args);
        if (!result || !result.value)
          result = {value: result};
      } else {
        // this is a function that we're managing
        let args = this.arguments.reduce((acc, arg) => {
          if (arg.type == "SpreadElement") {
            return acc.concat(arg.argument.elements);
          }
          return acc.concat(arg);
        }, []);
        result = await this.Engine.callFunction(callee, args, fThis);
      }
      if (this.type == "NewExpression" && typeof result.value === "undefined")
        return {value: fThis};
      else
        return result;
    }
  }
];