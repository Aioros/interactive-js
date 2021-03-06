const Completion = require("../completion.js");

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
      var completion = Completion("normal");
      if (!this.isMainFunctionBlock) {
        // Add a temporary VO in the scope chain
        this.Engine.Scope.pushBlockScope();
      }

      for (var s=0; s<this.body.length; s++) {
        completion = await this.Engine.process(this.body[s]);
        if (completion.type != "normal")
          break;
      }

      if (!this.isMainFunctionBlock) {
        // Remove the temporary VO
        this.Engine.Scope.popBlockScope();
      }

      if (completion.type == "break") {
        if (completion.target && completion.target === this.label) {
          // We're breaking from this block, we catch the termination
          // so outer blocks keep going normally
          return Completion("normal");
        } else {
          // We're breaking from an outer block, so we pass the termination through
          return completion;
        }
      }
      return completion;
    }
  },
  
  {
    type: "ReturnStatement",
    execute: async function() {
      return Completion("return", await this.Engine.process(this.argument));
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
        let assignCompletion = await this.Engine.process({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: assignDec.id,
            right: assignDec.init
          }
        });
        if (assignCompletion.type == "error") return assignCompletion;
      };
      return Completion("normal");
    }
  },
  
  {
    type: "IfStatement",
    execute: async function() {
      if ((await this.Engine.process(this.test)).unwrap()) {
        return await this.Engine.process(this.consequent);
      } else if (this.alternate) {
        return await this.Engine.process(this.alternate);
      }
      return Completion("normal");
    }
  },
  
  {
    type: "SwitchStatement",
    execute: async function() {
      var completion;
      var discriminant = (await this.Engine.process(this.discriminant)).unwrap();
      for (var c in this.cases) {
        let test;
        if (this.cases[c].test)
          test = (await this.Engine.process(this.cases[c].test)).unwrap();
        if (!this.cases[c].test || this.cases[c].test && test == discriminant) {
          completion = await this.Engine.process({
            type: "BlockStatement",
            body: this.cases[c].consequent
          });
        }
        if (completion.type == "break")
          break;
      }
      return completion;
    }
  },

  {
    type: "ForInStatement",
    execute: async function() {
      var completion = Completion("normal");
      for (var k in (await this.Engine.process(this.right)).unwrap()) {
        var initStatement = {
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: this.left.type == "Identifier" ? this.left : this.left.declarations[0].id,
            right: k
          }
        };
        let _body = Object.assign({}, this.body, {body: [initStatement, ...this.body.body]});
        completion = await this.Engine.process(_body);
        if (completion.type != "normal") {
          break;
        }
      }
      if (completion.type == "break") {
        if (!completion.target || completion.target === this.label) {
          // We're breaking from this loop, catch the termination
          return Completion("normal");
        } else {
          // We're breaking from an external loop, pass it through
          return completion;
        }
      }
      return completion;
    }
  },

  {
    type: "ForOfStatement",
    execute: async function() {
      var completion = Completion("normal");
      var right = (await this.Engine.process(this.right)).unwrap();
      var iterator = right[Symbol.iterator];
      if (iterator)
        iterator = iterator();
      if (!iterator || !iterator.next) {
        let rightString = this.Engine.script.substring([...right.range]);
        return Completion("error", rightString + "is not iterable");
      }
      do {
        var k = await iterator.next();
        if (!k.done) {
          var initStatement = {
            type: "ExpressionStatement",
            expression: {
              type: "AssignmentExpression",
              operator: "=",
              left: this.left.type == "Identifier" ? this.left : this.left.declarations[0].id,
              right: k.value
            }
          };
          let _body = Object.assign({}, this.body, {body: [initStatement, ...this.body.body]});
          completion = await this.Engine.process(_body);
          if (completion.type != "normal") {
            if (iterator.return)
              await iterator.return();
            break;
          }
        }
      } while (!k.done);

      if (completion.type == "break") {
        if (!completion.target || completion.target === this.label) {
          // We're breaking from this loop, catch the termination
          return Completion("normal");
        } else {
          // We're breaking from an external loop, pass it through
          return completion;
        }
      }
      return completion;
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
      var completion;
      while ((await this.Engine.process(this.test)).unwrap()) {
        completion = await this.Engine.process(this.body);
        if (completion.type != "normal") {
          break;
        }
      }
      if (completion.type == "break") {
        if (!completion.target || completion.target === this.label) {
          // We're breaking from this loop, catch the termination
          return Completion("normal");
        } else {
          // We're breaking from an external loop, pass it through
          return completion;
        }
      }
      return completion;
    }
  },
  
  {
    type: "BreakStatement",
    execute: async function() {
      var completion = Completion("break");
      if (this.label)
        completion.target = this.label.name;
      return completion;
    }
  },
  
  {
    type: "ContinueStatement",
    execute: async function() {
      return Completion("continue");
    }
  },
  
  {
    type: "ExpressionStatement",
    execute: async function() {
      return Completion("normal", await this.Engine.process(this.expression));
    }
  },
  
  {
    type: "FunctionDeclaration",
    execute: async function() {
      var exp = Object.assign({}, this, {type: "FunctionExpression"});
      delete exp._initialized;
      delete exp.isStatement;
      delete exp.execute;
      return Completion("normal", await this.Engine.process(exp));
    }
  },

  {
    type: "TryStatement",
    execute: async function() {
      var completion = await this.Engine.process(this.block);
      if (completion.type == "error") {
        if (this.handler) {
          let errDecl = {
            type: "VariableDeclaration",
            kind: "let",
            declarations: [{
              type: "VariableDeclarator",
              id: this.handler.param,
              init: completion.getCompletionValue()
            }]
          };
          let handlerBlock = this.handler.body;
          handlerBlock.body = [errDecl, ...handlerBlock.body];
          completion = await this.Engine.process(handlerBlock);
        }
      }
      if (this.finalizer) {
        await this.Engine.process(this.finalizer);
      }
      return completion;
    }
  },

  {
    type: "ThrowStatement",
    execute: async function() {
      return Completion("error", await this.Engine.process(this.argument));
    }
  }
  
];