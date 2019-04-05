module.exports = [

  {
    type: "EmptyStatement",
    execute: async function() {
      return {type: "normal"};
    }
  },

  {
    type: "LabeledStatement",
    execute: async function() {
      // Add label property to the Loop/BlockStatement inside
      this.body.label = this.label.name;
      return await this.Engine.process(this.body);
    }
  },
  
  {
    type: "BlockStatement",
    execute: async function() {
      var result = {type: "normal"};
      if (!this.isMainFunctionBlock) {
        // Add a temporary VO in the scope chain
        this.Engine.Scope.pushBlockScope();
      }

      for (var s=0; s<this.body.length; s++) {
        result = await this.Engine.process(this.body[s]);
        if (result.type != "normal")
          break;
      }

      if (!this.isMainFunctionBlock) {
        // Remove the temporary VO
        this.Engine.Scope.popBlockScope();
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
    execute: async function() {
      return {type: "return", value: await this.Engine.process(this.argument)};
    }
  },
  
  {
    type: "VariableDeclaration",
    execute: async function() {
      // "let" declarations
      if (this.kind == "let") {
        this.declarations.forEach(letDec => {
          var ids = this.Engine.extractIdentifiers(letDec.id);
          ids.forEach(id => {
            this.Engine.Scope.define(id.name, "let", undefined);
          });
        });
      }
      // Declaration with init => ExpressionStatement->AssignmentExpression
      for (let assignDec of this.declarations.filter(d => d.init)) {
        await this.Engine.process({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: assignDec.id,
            right: assignDec.init
          }
        });
      };
      return {type: "normal", value: undefined};
    }
  },
  
  {
    type: "IfStatement",
    execute: async function() {
      if (await this.Engine.process(this.test)) {
        return await this.Engine.process(this.consequent);
      } else if (this.alternate) {
        return await this.Engine.process(this.alternate);
      }
      return {type: "normal"};
    }
  },
  
  {
    type: "SwitchStatement",
    execute: async function() {
      var result;
      var discriminant = await this.Engine.process(this.discriminant);
      for (var c in this.cases) {
        let test;
        if (this.cases[c].test)
          test = await this.Engine.process(this.cases[c].test);
        if (!this.cases[c].test || this.cases[c].test && test == discriminant) {
          result = await this.Engine.process({
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
    execute: async function() {
      var loopStatement = this.Engine.normalizeLoop(this);
      return await this.Engine.process(loopStatement);
    }
  },
  
  {
    type: "WhileStatement",
    execute: async function() {
      var result;
      while ((await this.Engine.process(this.test)).value) {
        result = await this.Engine.process(this.body);
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
    execute: async function() {
      var result = {type: "break"};
      if (this.label)
        result.target = this.label.name;
      return result;
    }
  },
  
  {
    type: "ContinueStatement",
    execute: async function() {
      return {type: "continue"};
    }
  },
  
  {
    type: "ExpressionStatement",
    execute: async function() {
      return {type: "normal", value: await this.Engine.process(this.expression)};
    }
  },
  
  {
    type: "FunctionDeclaration",
    execute: async function() {
      var exp = Object.assign({}, this, {type: "FunctionExpression"});
      delete exp._initialized;
      delete exp.isStatement;
      delete exp.execute;
      return {type: "normal", value: await this.Engine.process(exp)};
    }
  }
  
];