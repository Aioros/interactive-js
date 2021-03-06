const esprima = require("esprima");
const path = require("path");

var expressionTypes = [],
    statementTypes = [];

expressionTypes = expressionTypes.concat(
  require("./lib/expressions/assignmentExpression.js"),
  require("./lib/expressions/callExpression.js"),
  require("./lib/expressions/functionExpressions.js"),
  require("./lib/expressions/miscExpressions.js"),
  require("./lib/expressions/opExpressions.js"),
);
statementTypes = statementTypes.concat(
  require("./lib/statements/statements.js")
);

function deepCopyMap(o, map = (x => x)) {
  var out, v, key;
  out = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    out[key] = (typeof v === "object" && v !== null) ? deepCopyMap(v, map) : v;
  }
  if (!Array.isArray(out) && typeof out === "object" && out.hasOwnProperty("type")) {
    return map(out);
  }
  return out;
}

module.exports = {
  init: function(engine) {
    this.Engine = engine;
  },
  setupNode: function(node) {
    var expType = expressionTypes.find(t => t.type == node.type || t.type.includes(node.type));
    var stmType = statementTypes.find(t => t.type == node.type || t.type.includes(node.type));
    if (expType) {
      node = Object.assign({}, expType, {isExpression: true}, node);
    } else if (stmType) {
      node = Object.assign({}, stmType,  {isStatement: true}, node);
    } else {
      node.evaluate = node.execute = function() { console.log("Node not recognized", this); };
    }
    node._initialized = true;
    node.toString = function() {
      if (this.range) {
        return this.Engine.script.substring(...this.range);
      } else {
        return "";
      }
    };
    if (node.hasOwnProperty("type"))
      node.Engine = this.Engine;
    return node;
  },
  parse: function(script) {
    var tree = esprima.parseScript(script, {range: true, loc: true});
    tree = deepCopyMap(tree, this.setupNode.bind(this));
    var mainFunctionAST = tree.body[0];
    return mainFunctionAST;
  }
};