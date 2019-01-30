module.exports = [

  {
    type: "LabeledStatement",
    execute: function() {
      // Add label property to the Loop/BlockStatement inside
      this.body.label = this.label.name;
      return this.Engine.process(this.body);
    }
  },
  
  {
    type: "BlockStatement",
    execute: function() {
      var result;
      if (!this.isMainFunctionBlock) {
        // Add a temporary VO in the scope chain
        this.Engine.Scope.pushBlockScope();
      }

      for (var s=0; s<this.body.length; s++) {
        result = this.Engine.process(this.body[s]);
        if (result.type != "normal")
          break;
      }

      if (!this.isMainFunctionBlock) {
        // Remove the temporary VO
        this.Scope.popBlockScope();
      }

      if (result.type == "break") {
        if (result.target && result.target === this.label) {
          // We're breaking from this block, we catch the termination
          // so outer blocks keep going normally
          return {type: "normal"};
        } else {
          // We're breaking from an outer block, so we pass the termination through
          return result;
        }
      }
      return result;
    }
  },
  
  {
    type: "ReturnStatement",
    execute: function() {
      return {type: "return", value: this.Engine.process(this.argument)};
    }
  },
  
  {
    type: "VariableDeclaration",
    execute: function() {
      // "let" declarations
      if (this.kind == "let") {
        this.declarations.forEach(letDec => {
          this.Engine.Scope.define(letDec.id.name, "let", undefined);
        });
      }
      // Declaration with init => ExpressionStatement->AssignmentExpression
      this.declarations.filter(d => d.init).forEach(assignDec => {
        this.Engine.process({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: assignDec.id,
            right: assignDec.init
          }
        });
      });
      return {type: "normal", value: undefined};
    }
  },
  
  {
    type: "IfStatement",
    execute: function() {
      if (this.Engine.process(this.test)) {
        return this.Engine.process(this.consequent);
      } else if (this.alternate) {
        return this.Engine.process(this.alternate);
      }
    }
  },
  
  {
    type: "SwitchStatement",
    execute: function() {
      var result;
      var discriminant = this.Engine.process(this.discriminant);
      for (var c in this.cases) {
        let test;
        if (this.cases[c].test)
          test = this.Engine.process(this.cases[c].test);
        if (!this.cases[c].test || this.cases[c].test && test == discriminant) {
          result = this.Engine.process({
            type: "BlockStatement",
            body: this.cases[c].consequent
          });
        }
        if (result.type == "break")
          break;
      }
      return result;
    }
  },
  
  {
    type: ["ForStatement", "DoWhileStatement"],
    execute: function() {
      var loopStatement = this.Engine.normalizeLoop(this);
      return this.Engine.process(loopStatement);
    }
  },
  
  {
    type: "WhileStatement",
    execute: function() {
      var result;
      while (this.Engine.process(this.test)) {
        result = this.Engine.process(this.body);
        if (result.type != "normal") {
          break;
        }
      }
      if (result.type == "break") {
        if (!result.target || result.target === this.label) {
          // We're breaking from this loop, catch the termination
          return {type: "normal"};
        } else {
          // We're breaking from an external loop, pass it through
          return result;
        }
      }
      return result;
    }
  },
  
  {
    type: "BreakStatement",
    execute: function() {
      var result = {type: "break"};
      if (this.label)
        result.target = this.label.name;
      return result;
    }
  },
  
  {
    type: "ContinueStatement",
    execute: function() {
      return {type: "continue"};
    }
  },
  
  {
    type: "ExpressionStatement",
    execute: function() {
      return {type: "normal", value: this.Engine.process(this.expression)};
    }
  },
  
  {
    type: "FunctionDeclaration",
    execute: function() {
      return {type: "normal", value: undefined};
    }
  }
  
];