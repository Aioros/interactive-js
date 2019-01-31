module.exports = [
  
  {
    type: "UnaryExpression",
    evaluate: async function() {
      switch (this.operator) {
        case '+':
          return +(await this.Engine.process(this.argument));
          break;
        case '-':
          return -(await this.Engine.process(this.argument));
          break;
        case '~':
          return ~(await this.Engine.process(this.argument));
          break;
        case '!':
          return !(await this.Engine.process(this.argument));
          break;
        case 'delete':
          if (this.argument.type == "MemberExpression") {
            var obj = this.Engine.Scope.findIdentifier(this.argument.object.name);
            return delete obj.value[this.argument.property.name];
          }
          break;
        case 'typeof':
          return typeof await this.Engine.process(this.argument);
          break;
        case 'void':
          await this.Engine.process(this.argument);
          return undefined;
          break;
      }
    }
  },
  
  {
    type: ["LogicalExpression", "BinaryExpression"],
    evaluate: async function() {
      var [left, right] = [this.left, this.right];
      switch (this.operator) {
        case '&&':
          return (await this.Engine.process(left) && await this.Engine.process(right));
          break;
        case '||':
          return (await this.Engine.process(left) || await this.Engine.process(right));
          break;
        case '+':
          return (await this.Engine.process(left) + await this.Engine.process(right));
          break;
        case '-':
          return (await this.Engine.process(left) - await this.Engine.process(right));
          break;
        case '*':
          return (await this.Engine.process(left) + await this.Engine.process(right));
          break;
        case '/':
          return (await this.Engine.process(left) / await this.Engine.process(right));
          break;
        case '%':
          return (await this.Engine.process(left) % await this.Engine.process(right));
          break;
        case '**':
          return (await this.Engine.process(left) ** await this.Engine.process(right));
          break;
        case '|':
          return (await this.Engine.process(left) | await this.Engine.process(right));
          break;
        case '^':
          return (await this.Engine.process(left) ^ await this.Engine.process(right));
          break;
        case '&':
          return (await this.Engine.process(left) & await this.Engine.process(right));
          break;
        case '==':
          return (await this.Engine.process(left) == await this.Engine.process(right));
          break;
        case '!=':
          return (await this.Engine.process(left) != await this.Engine.process(right));
          break;
        case '===':
          return (await this.Engine.process(left) === await this.Engine.process(right));
          break;
        case '!==':
          return (await this.Engine.process(left) !== await this.Engine.process(right));
          break;
        case '<':
          return (await this.Engine.process(left) < await this.Engine.process(right));
          break;
        case '>':
          return (await this.Engine.process(left) > await this.Engine.process(right));
          break;
        case '<=':
          return (await this.Engine.process(left) <= await this.Engine.process(right));
          break;
        case '>=':
          return (await this.Engine.process(left) >= await this.Engine.process(right));
          break;
        case '<<':
          return (await this.Engine.process(left) << await this.Engine.process(right));
          break;
        case '>>':
          return (await this.Engine.process(left) >> await this.Engine.process(right));
          break;
        case '>>>':
          return (await this.Engine.process(left) >>> await this.Engine.process(right));
          break;
        case 'instanceof':
          return (await this.Engine.process(left) instanceof await this.Engine.process(right));
          break;
        case 'in':
          return (await this.Engine.process(left) in await this.Engine.process(right));
          break;
      }
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