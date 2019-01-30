// Can't believe that I need express to stop the app from restarting
////////////////////////////////
const express = require("express");
var app = express();
var listener = app.listen(process.env.PORT, function () {});
////////////////////////////////

const Compiler = require("./compiler.js");
const Scope = require("./scope.js");
const Context = require("./context.js");

var actionHooks = new Map();

const Engine = {
  _initialized: false,
  init: function(useStrict = false) {
    if (!this._initialized) {
      this._initialized = true;
      this.useStrict = useStrict;
      this.appendStatement = null;
      this.callStack = [];
      this.Compiler = Object.create(Compiler);
      this.Compiler.init(this);
      this.Scope = Object.create(Scope);
      this.Scope.init(this);
    }
  },
  start: function(script) {
    this.init();
    var mainFunction = this.Compiler.parse(script);
    mainFunction.context = Object.create(Context);
    mainFunction.context.init("Global");
    this.callStack.push(mainFunction.context);
    return this.processFunction(mainFunction);
    // this is where the event loop should be
  },
  
  getCurrentContext: function() {
    if (this.callStack.length > 0)
      return this.callStack[this.callStack.length-1];
  },
  
  // maybe this two should be in Scope? not sure
  extractIdentifiers: function (expression) {
    switch (expression.type) {
      case "Identifier":
        return [expression];
        break;
      case "ArrayPattern":
        return expression.elements.reduce((acc, el) => {
          return acc.concat(this.extractIdentifiers(el));
        }, []);
        break;
      case "ObjectPattern":
        return expression.properties.reduce((acc, prop) => {
          return acc.concat(this.extractIdentifiers(prop.value));
        }, []);
        break;
      case "AssignmentPattern":
        return [expression.left];
        break;
    }
  },
  
  findMemberExpression: function(expression) {
    var info = {
      obj: null,
      prop: expression.computed ? this.process(expression.property) : expression.property.name,
      getValue: function() {
        return this.obj[this.prop];
      }
    }
    info.obj = this.process(expression.object, true);
    return info;
  },
  
  // All loops are transformed in an equivalent while loop
  normalizeLoop: function(loopStatement) {
    var result;
    switch (loopStatement.type) {
      case "ForStatement":
        result = {
          type: "BlockStatement",
          body: []
        };
        result.body.push(loopStatement.init);
        var mainLoop = {
          type: "WhileStatement",
          test: loopStatement.test,
          body: {
            type: "BlockStatement",
            body: [...loopStatement.body.body,
                   {type: "ExpressionStatement", expression: loopStatement.update}]
          }
        };
        result.body.push(mainLoop);
        break;
      case "DoWhileStatement":
        var breakCondition = {
          type: "IfStatement",
          test: {type: "UnaryExpression", operator: "!", argument: loopStatement.test},
          consequent: {type: "BreakStatement"}
        };
        result = {
          type: "WhileStatement",
          test: {type: "Literal", value: true},
          body: {
            type: "BlockStatement",
            body: [...loopStatement.body.body, breakCondition]
          }
        };
        break;
    }
    return result;
  },
  
  processFunction: function(tree, callParams = []) {
    
    // The function body is a BlockStatement, whose body is our set of statements
    var body = tree.body;
    body.isMainFunctionBlock = true;
    
    // define function arguments
    this.Scope.define("arguments", "var", callParams.map(p => {
      return this.process(p);
    }));
    // args definition and assignment is performed as an array-pattern variable declaration
    if (tree.params.length > 0) {
      var ids = this.extractIdentifiers({type: "ArrayPattern", elements: tree.params});
      ids.forEach(id => {
        this.Scope.define(id.name, "var", undefined);
      });
      let argsStatement = {
        type: "VariableDeclaration",
        kind: "var",
        declarations: [{
          type: "VariableDeclarator",
          id: {
            type: "ArrayPattern",
            elements: tree.params
          },
          init: {
            type: "ArrayExpression",
            elements: callParams
          }
        }]
      };
      this.process(argsStatement);
    }

    // Find variable and function declarations for hoisting
    // flattenBlocks is used to look for nested declarations
    function flattenBlocks(tree) {
      var target;
      target = tree.body ? tree.body : tree;
      target = Array.isArray(target) ? target : [target];
      var reducer = (acc, val) => {
        // TODO: probably something else here
        if (val.type == "BlockStatement") {
          return acc.concat(flattenBlocks(val.body));
        } else if (val.type == "IfStatement") {
          let result = acc.concat(val.consequent);
          if (val.alternate)
            result = result.concat(val.alternate);
          return result;
        } else if (val.type == "ForStatement") {
          return acc.concat(val.init, val.test, val.update, flattenBlocks(val.body));
        } else if (["ForInStatement", "ForOfStatement"].includes(val.type)) {
          return acc.concat(val.left, flattenBlocks(val.body));
        } else if (["WhileStatement", "DoWhileStatement"].includes(val.type)) {
          return acc.concat(val.test, flattenBlocks(val.body));
        } else if (val.type == "SwitchStatement") {
          return acc.concat(flattenBlocks(val.cases.map(c => c.consequent)));
        } else {
          return acc.concat(val);
        }
      };
      return target.reduce(reducer, []);
    }
    var tempTree = flattenBlocks(body);

    var funDecs = tempTree.filter(s => s.type == "FunctionDeclaration");
    var varDecs = tempTree.filter(s => s.type == "VariableDeclaration" && s.kind != "let");
    funDecs.forEach(dec => {
      // associate an execution context to this function with the right scope chain
      dec.context = Object.create(Context);
      dec.context.init(dec.id.name);
      dec.context.ScopeChain = dec.context.ScopeChain.concat(this.getCurrentContext().ScopeChain);
      this.Scope.define(dec.id.name, "function", dec);
    });
    varDecs.forEach(decs => {
      decs.declarations.forEach(dec => {
        var ids = this.extractIdentifiers(dec.id);
        ids.forEach(id => {
          this.Scope.define(id.name, decs.kind, undefined);
        });
      });
    });

    // Evaluation
    return this.process(body);

  },
  
  addAction: function(hooks, action) {
    if (!action) return;
    if (!Array.isArray(hooks)) {
      hooks = [hooks];
    }
    hooks.forEach(hook => {
      if (!actionHooks.has(hook))
        actionHooks.set(hook, []);
      actionHooks.get(hook).push(action);
    });
  },

  getActions: function(hook) {
    return Array.from(actionHooks.entries()).filter(([key, ]) => {
      if (typeof key === "string") {
        return hook == key;
      } else if (key instanceof RegExp) {
        return key.test(hook);
      }
    }).reduce((acc, [, actions]) => acc.concat(actions), []);
  },
  
  process: function(node, debug) {    
    if (!node._initialized) {
      node = this.Compiler.setupNode(node, debug);
    }
    
    for (let action of this.getActions(node.type)) {
      action.call(node, node);
    }
    
    var result;
    if (node.isStatement) {
      result = node.execute();
    } else if (node.isExpression) {
      result = node.evaluate();
    }
    return result;
  },
  
  callFunction(f, args) {
    this.callStack.push(f.context);
    var result = this.processFunction(f, args).value;
    this.callStack.pop();
    return result;
  }
  
};

module.exports = Engine;