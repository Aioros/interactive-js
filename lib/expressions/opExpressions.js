module.exports = [
  
  {
    type: "UnaryExpression",
    evaluate: function() {
      switch (this.operator) {
        case '+':
          return +(this.Engine.process(this.argument));
          break;
        case '-':
          return -(this.Engine.process(this.argument));
          break;
        case '~':
          return ~(this.Engine.process(this.argument));
          break;
        case '!':
          return !(this.Engine.process(this.argument));
          break;
        case 'delete':
          if (this.argument.type == "MemberExpression") {
            var obj = this.Engine.Scope.findIdentifier(this.argument.object.name);
            return delete obj.value[this.argument.property.name];
          }
          break;
        case 'typeof':
          return typeof this.Engine.process(this.argument);
          break;
        case 'void':
          this.Engine.process(this.argument);
          return undefined;
          break;
      }
    }
  },
  
  {
    type: ["LogicalExpression", "BinaryExpression"],
    evaluate: function() {
      var [left, right] = [this.left, this.right];
      switch (this.operator) {
        case '&&':
          return (this.Engine.process(left) && this.Engine.process(right));
          break;
        case '||':
          return (this.Engine.process(left) || this.Engine.process(right));
          break;
        case '+':
          return (this.Engine.process(left) + this.Engine.process(right));
          break;
        case '-':
          return (this.Engine.process(left) - this.Engine.process(right));
          break;
        case '*':
          return (this.Engine.process(left) + this.Engine.process(right));
          break;
        case '/':
          return (this.Engine.process(left) / this.Engine.process(right));
          break;
        case '%':
          return (this.Engine.process(left) % this.Engine.process(right));
          break;
        case '**':
          return (this.Engine.process(left) ** this.Engine.process(right));
          break;
        case '|':
          return (this.Engine.process(left) | this.Engine.process(right));
          break;
        case '^':
          return (this.Engine.process(left) ^ this.Engine.process(right));
          break;
        case '&':
          return (this.Engine.process(left) & this.Engine.process(right));
          break;
        case '==':
          return (this.Engine.process(left) == this.Engine.process(right));
          break;
        case '!=':
          return (this.Engine.process(left) != this.Engine.process(right));
          break;
        case '===':
          return (this.Engine.process(left) === this.Engine.process(right));
          break;
        case '!==':
          return (this.Engine.process(left) !== this.Engine.process(right));
          break;
        case '<':
          return (this.Engine.process(left) < this.Engine.process(right));
          break;
        case '>':
          return (this.Engine.process(left) > this.Engine.process(right));
          break;
        case '<=':
          return (this.Engine.process(left) <= this.Engine.process(right));
          break;
        case '>=':
          return (this.Engine.process(left) >= this.Engine.process(right));
          break;
        case '<<':
          return (this.Engine.process(left) << this.Engine.process(right));
          break;
        case '>>':
          return (this.Engine.process(left) >> this.Engine.process(right));
          break;
        case '>>>':
          return (this.Engine.process(left) >>> this.Engine.process(right));
          break;
        case 'instanceof':
          return (this.Engine.process(left) instanceof this.Engine.process(right));
          break;
        case 'in':
          return (this.Engine.process(left) in this.Engine.process(right));
          break;
      }
    }
  },
  
  {
    type: "UpdateExpression",
    evaluate: function() {
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
        return this.Engine.process(expandedUpdate);
      } else { // eg. x++, we evaluate x and append x=x+1 for later
        this.Engine.appendStatement = {
          type: "ExpressionStatement",
          expression: expandedUpdate
        };
        return this.Engine.process(this.argument);
      }
    }
  }
];