const Compiler = require("./compiler.js");
const Scope = require("./scope.js");
const Context = require("./context.js");
const MessageQueue = require("./messageQueue.js");
const asyncApis = require("./lib/asyncApis.js");
const arrayMethods = require("./lib/arrayMethods.js");
const ExpValue = require("./lib/expValue.js");
const Completion = require("./lib/completion.js");
const GenIterator = require("./lib/genIterator.js");

const vm = require("vm");

var actionHooks = {before: new Map(), after: new Map()};

function createGlobalObject(obj) {
  // Get the global object from a vm sandbox
  // Not a looker, but gets the job done

  // https://github.com/flexdinesh/browser-or-node/blob/master/src/index.js
  //const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  //const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

  var sandbox = vm.createContext(obj);
  vm.runInContext(`
    var globalOrWindow = (1, eval)(this);
    globalOrWindow.Array.prototype = arrayMethods(Array);
  `, sandbox);
  
  return sandbox;
}

const Engine = {
  _initialized: false,
  init: function(script, globalObj = {}, useStrict = false) {
    if (!this._initialized) {
      this._initialized = true;
      this.script = "function Global() { " + script + " }";
      this.globalObj = createGlobalObject(Object.assign(
        {},
        asyncApis(this),
        {arrayMethods},
        globalObj
      ));
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
    mainFunction.context.init(mainFunction);

    mainFunction.context.VO.vars = this.globalObj;
    this.callStack.push(mainFunction.context);

    this.Scope.define("global", "var", globalObj); // TODO: or window? or something else?
    this.Scope.define("this", "var", globalObj);
    var completion = await this.processFunction(mainFunction);
    if (completion.type == "error") {
      console.error("Uncaught", completion.getCompletionValue());
    }
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
      prop: expression.computed ? (await this.process(expression.property)).unwrap() : expression.property.name,
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
      args.push((await this.process(p)).unwrap());
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
        } else if (val.type == "TryStatement") {
          return acc.concat(
            flattenBlocks(val.block),
            val.handler ? flattenBlocks(val.handler) : [],
            val.finalizer ? flattenBlocks(val.finalizer) : []
          );
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
    f.context.init(f, this.getCurrentContext());
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

    if (node._processed) {
      //return node._processed;
    }
    
    for (let action of this.getActions(node.type, "before")) {
      await action.call(node, node);
    }
    
    var result;
    if (node.isStatement) {
      try {
        result = await node.execute();
      } catch (err) {
        if (err.control && err.control == "return") {
          // This is actually a return interrupt (see genIterator.js)
          result = Completion("return", err);
        } else {
          result = Completion("error", err);
        }
      }
      if (this.appendStatement) {
        let appSt = this.appendStatement;
        this.appendStatement = null;
        await this.process(appSt);
      }
    } else if (node.isExpression) {
      result = await node.evaluate();
      if (result && result.control == "error") {
        // This will be caught by the enclosing statement
        throw result.unwrap();
      }
    }

    node._processed = result;

    for (let action of this.getActions(node.type, "after")) {
      await action.call(node, node);
    }

    return result;
  },
  
  callFunction: async function(f, args, fThis) {

    if (f.generator) {
      return Completion("return", GenIterator(f, args, fThis));
    }

    if (!f.context)
      this.createFunctionContext(f);
    this.callStack.push(f.context);
    var completion = await this.processFunction(f, args, fThis);
    this.callStack.pop();
    return completion;
  }
  
};

module.exports = Engine;