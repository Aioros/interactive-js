module.exports = [
  {
    type: ["CallExpression", "NewExpression"],
    evaluate: async function() {
      var callee, fThis = null, name, result;
      if (this.callee.type == "Identifier") {
        callee = this.Engine.Scope.findIdentifier(this.callee.name);
        name = this.callee.name;
      } else if (this.callee.type == "MemberExpression") {
        callee = await this.Engine.process(this.callee);
        if (callee.type != "ArrowFunctionExpression")
          fThis = this.callee.object;
        name = this.callee.property.name;
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
      } else if (callee[Symbol.toStringTag] == "InteractiveFunction") {
        // this is a function that we're managing
        let args = [];
        for (let arg of this.arguments) {
          if (arg.type == "SpreadElement") {
            arg = (await this.Engine.process(arg)).value;
          }
          args = args.concat(arg);
        }
        result = await this.Engine.callFunction(callee, args, fThis);
      } else {
        throw new TypeError(name + " is not a function");
      }
      if (this.type == "NewExpression" && typeof result.value === "undefined")
        return {value: fThis};
      else
        return result;
    }
  }
];