const ExpValue = require("../expValue.js");

module.exports = [
  {
    type: ["CallExpression", "NewExpression"],
    evaluate: async function() {
      var callee, fThis = null, name, result;
      if (this.callee.type == "Identifier") {
        callee = this.Engine.Scope.findIdentifier(this.callee.name).value;
        name = this.callee.name;
      } else if (this.callee.type == "MemberExpression") {
        mExpInfo = await this.Engine.findMemberExpression(this.callee);
        callee = mExpInfo.getValue();
        if (callee.type != "ArrowFunctionExpression") {
          fThis = mExpInfo.obj;
        }
        name = this.callee.property.name;
      }
      if (this.type == "NewExpression") {
        fThis = Object.create(callee.prototype);
      }
      if (typeof callee === "function") {
        // this is an actual function, either external or one of our shims (like .apply's, .call's, or .bind's)
        // we basically execute them as they are
        let args = [];
        for (let a of this.arguments) {
          args = args.concat((await this.Engine.process(a)).unwrap());
        }
        result = await callee.apply(fThis, args);
      } else if (callee[Symbol.toStringTag] == "InteractiveFunction") {
        // this is a function that we're managing
        let args = [];
        for (let arg of this.arguments) {
          if (arg.type == "SpreadElement") {
            arg = (await this.Engine.process(arg)).unwrap();
          }
          args = args.concat(arg);
        }
        result = (await this.Engine.callFunction(callee, args, fThis));
      } else {
        throw new TypeError(name + " is not a function");
      }
      if (result && result.unwrap)
          result = result.unwrap();
      if (this.type == "NewExpression" && typeof result === "undefined") {
        return ExpValue(fThis);
      } else {
        return ExpValue(result);
      }
    }
  }
];