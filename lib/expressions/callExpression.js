const ExpValue = require("../expValue.js");

module.exports = [
  {
    type: ["CallExpression", "NewExpression"],
    evaluate: async function() {
      var callee, fThis = null, name, result;
      const evaluateArgs = (async function(origArgs) {
        let args = [];
        for (let a of origArgs) {
          let evaluated = (await this.Engine.process(a)).unwrap();
          if (a.type == "SpreadElement") {
            args = args.concat(evaluated);  
          } else {
            args.push(evaluated);
          }
        }
        return args;
      }).bind(this);
      if (this.callee.type == "Identifier") {
        callee = this.Engine.Scope.findIdentifier(this.callee.name).value;
        name = this.callee.name;
      } else if (this.callee.type == "MemberExpression") {
        mExpInfo = await this.Engine.findMemberExpression(this.callee);
        callee = mExpInfo.getValue();
        if (callee && callee.type != "ArrowFunctionExpression") {
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
        let args = await evaluateArgs(this.arguments);
        result = await callee.apply(fThis, args);
      } else if (callee && callee[Symbol.toStringTag] == "InteractiveFunction") {
        // this is a function that we're managing
        let args = await evaluateArgs(this.arguments);
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