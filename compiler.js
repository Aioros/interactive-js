const esprima = require("esprima");
const glob = require("glob");
const path = require("path");

var expressionTypes = [],
    statementTypes = [];

glob.sync("./lib/expressions/**/*.js").forEach(function(file) {
  expressionTypes = expressionTypes.concat(require(path.resolve(file)));
});
glob.sync("./lib/statements/**/*.js").forEach(function(file) {
  statementTypes = statementTypes.concat(require(path.resolve(file)));
});

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
    if (node.hasOwnProperty("type"))
      node.Engine = this.Engine;
    return node;
  },
  parse: function(script) {
    script = "function Global() { " + script + " }";
    var tree = esprima.parseScript(script, {range: true, loc: true});
    tree = deepCopyMap(tree, this.setupNode.bind(this));
    var mainFunctionAST = tree.body[0];
    //console.log(mainFunctionAST);
    return mainFunctionAST;
  }
};