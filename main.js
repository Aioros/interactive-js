const Engine = require("./engine.js");

var script = `
function foo(a, b, [c, {passD: d}]) {
	console.log(a, b, c, d);
}

foo(1, 2, [3, {passD: 4}]);
`;
var e = Object.create(Engine);
e.addAction("CallExpression", function(e) {console.log("call hook1: ", e.type);});
e.addAction("CallExpression", function(e) {console.log("call hook2: ", e.type);});
e.addAction("VariableDeclaration", function(s) {console.log("var hook: ", s.type);});
e.start(script);
console.log("done");