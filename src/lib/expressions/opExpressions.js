const ExpValue = require("../expValue.js");

module.exports = [
  
  {
    type: "UnaryExpression",
    evaluate: async function() {
      switch (this.operator) {
        case '+':
          return ExpValue(+(await this.Engine.process(this.argument)).unwrap());
          break;
        case '-':
          return ExpValue(-(await this.Engine.process(this.argument)).unwrap());
          break;
        case '~':
          return ExpValue(~(await this.Engine.process(this.argument)).unwrap());
          break;
        case '!':
          return ExpValue(!(await this.Engine.process(this.argument)).unwrap());
          break;
        case 'delete':
          if (this.argument.type == "MemberExpression") {
            var obj = this.Engine.Scope.findIdentifier(this.argument.object.name);
            return ExpValue(delete obj.value[this.argument.property.name]);
          }
          break;
        case 'typeof':
          return ExpValue(typeof (await this.Engine.process(this.argument)).unwrap());
          break;
        case 'void':
          await this.Engine.process(this.argument);
          return ExpValue(undefined);
          break;
      }
    }
  },
  
  {
    type: ["LogicalExpression", "BinaryExpression"],
    evaluate: async function() {
      var [left, right] = [this.left, this.right];
      var f = new Function(
        `return async function(left, right, engine) {
          return ((await engine.process(left)).unwrap() ` + this.operator + ` (await engine.process(right)).unwrap());
        };`
      )();
      return ExpValue(await f(left, right, this.Engine));
    }
  },
  
  {
    type: "UpdateExpression",
    evaluate: async function() {
      var add = (this.operator == "++" ? 1 : -1);
      var expandedUpdate = {
        type: "AssignmentExpression",
        operator: "=",
        left: this.argument,
        right: {
          type: "BinaryExpression",
          operator: "+",
          left: this.argument,
          right: {
            type: "Literal",
            value: add
          }
        }
      };
      if (this.prefix) { // eg. ++x, we can evaluate it on the spot
        return await this.Engine.process(expandedUpdate);
      } else { // eg. x++, we evaluate x and append x=x+1 for later
        this.Engine.appendStatement = {
          type: "ExpressionStatement",
          expression: expandedUpdate
        };
        return await this.Engine.process(this.argument);
      }
    }
  }
];