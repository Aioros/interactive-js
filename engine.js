const Compiler = require("./compiler.js");
const Scope = require("./scope.js");
const Context = require("./context.js");
const MessageQueue = require("./messageQueue.js");
const asyncApis = require("./lib/asyncApis.js");
const arrayMethods = require("./lib/arrayMethods.js");
const ExpValue = require("./lib/expValue.js");

const vm = require("vm");

var actionHooks = {before: new Map(), after: new Map()};

function createGlobalObject(engine) {
  // Trick the vm module into passing me its context object
  // Not a looker, but gets the job done
  var globalObj;

  function assignSandboxToGlobalObj(sb) {
    globalObj = sb;
  }

  var sandbox = vm.createContext();
  sandbox.assignSandboxToGlobalObj = assignSandboxToGlobalObj;
  vm.runInContext('assignSandboxToGlobalObj(this)', sandbox);
  delete globalObj['assignSandboxToGlobalObj'];

  globalObj.Array.prototype = arrayMethods(globalObj.Array);

  return globalObj;
}

const Engine = {
  _initialized: false,
  init: function(script, globalObj = {}, useStrict = false) {
    if (!this._initialized) {
      this._initialized = true;
      this.script = "function Global() { " + script + " }";
      this.globalObj = Object.assign(
        createGlobalObject(this),
        asyncApis(this),
        globalObj
      );
      this.useStrict = useStrict;
      this.appendStatement = null;
      this.callStack = [];
      this.Compiler = Object.create(Compiler);
      this.Compiler.init(this);
      this.Scope = Object.create(Scope);
      this.Scope.init(this);
      this.MessageQueue = Object.create(MessageQueue);
    }
  },
  run: async function(script, globalObj = {}, useStrict = false) {
    this.init(script, globalObj, useStrict);
    var mainFunction = this.Compiler.parse(this.script);
    mainFunction.context = Object.create(Context);
    mainFunction.context.init("Global");
    this.callStack.push(mainFunction.context);
    for (let key of Object.getOwnPropertyNames(this.globalObj)) {
      this.Scope.define(key, "var", this.globalObj[key]);
    }
    this.Scope.define("global", "var", globalObj); // TODO: or window? or something else?
    this.Scope.define("this", "var", globalObj);
    var completion = await this.processFunction(mainFunction);
    // this is where the event loop should be
    await this.MessageQueue.runEventLoop();
    return completion;
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
      case "RestElement":
        return [expression.argument];
        break;
    }
  },
  
  findMemberExpression: async function(expression) {
    var info = {
      obj: null,
      prop: expression.computed ? (await this.process(expression.property)).value : expression.property.name,
      getValue: function() {
        return this.obj[this.prop];
      }
    }
    info.obj = (await this.process(expression.object)).unwrap();
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
  
  processFunction: async function(tree, callParams = [], fThis = null) {
    
    // The function body is a BlockStatement, whose body is our set of statements
    var body = tree.body;
    body.isMainFunctionBlock = true;

    // define this
    if (fThis) {
      this.Scope.define("this", "var", (await this.process(fThis)).unwrap());
    }
    
    // define function arguments
    var args = [];
    for (let p of callParams) {
      args.push(await this.process(p));
    }
    this.Scope.define("arguments", "var", args);

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
      await this.process(argsStatement);
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
    for (let dec of funDecs) {
      let fn = await this.process(dec);
      this.Scope.define(dec.id.name, "function", fn.getCompletionValue());
    }
    varDecs.forEach(decs => {
      decs.declarations.forEach(dec => {
        var ids = this.extractIdentifiers(dec.id);
        ids.forEach(id => {
          this.Scope.define(id.name, decs.kind, undefined);
        });
      });
    });

    // Evaluation
    return await this.process(body);

  },

  createFunctionContext: function(f) {
    // associate an execution context to this function with the right scope chain
    f.context = Object.create(Context);
    f.context.init(f.id ? f.id.name : null);
    f.context.ScopeChain = f.context.ScopeChain.concat(this.getCurrentContext().ScopeChain);
  },
  
  addAction: function(hooks, action, when = "before") {
    if (!action) return;
    if (!Array.isArray(hooks)) {
      hooks = [hooks];
    }
    hooks.forEach(hook => {
      if (!actionHooks[when].has(hook))
        actionHooks[when].set(hook, []);
      actionHooks[when].get(hook).push(action);
    });
  },

  getActions: function(targetHook, targetWhen) {
    return Array.from(actionHooks[targetWhen].entries()).filter(([hook, ]) => {
      if (typeof hook === "string") {
        return targetHook == hook;
      } else if (hook instanceof RegExp) {
        return hook.test(targetHook);
      }
    }).reduce((acc, [, actions]) => acc.concat(actions), []);
  },
  
  process: async function(node) {
    if (!node || !node.type) {
      return ExpValue(node);
    } 

    if (!node._initialized) {
      node = this.Compiler.setupNode(node);
    }

    // Not sure why I needed this
    //if (!node.isStatement && !node.isExpression)
      //return node;
    
    for (let action of this.getActions(node.type, "before")) {
      await action.call(node, node);
    }
    
    var result;
    if (node.isStatement) {
      result = await node.execute();
      if (this.appendStatement) {
        let appSt = this.appendStatement;
        this.appendStatement = null;
        await this.process(appSt);
      }
    } else if (node.isExpression) {
      result = await node.evaluate();
    }

    for (let action of this.getActions(node.type, "after")) {
      await action.call(node, node);
    }

    return result;
  },
  
  callFunction: async function(f, args, fThis) {
    if (!f.context)
      this.createFunctionContext(f);
    this.callStack.push(f.context);
    var completion = await this.processFunction(f, args, fThis);
    this.callStack.pop();
    if (completion.type == "return")
      return completion.getCompletionValue();
  }
  
};

module.exports = Engine;