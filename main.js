const Engine = require("./engine.js");

var script = `
function foo(a, b, [c, {passD: d}]) {
	console.log(a, b, c, d);
}

foo(1, 2, [3, {passD: 4}]);
`;
var e = Object.create(Engine);
e.addAction("CallExpression", function(e) {console.log("call pre: ", e.type);}, "before");
e.addAction("CallExpression", function(e) {console.log("call post: ", e.type);}, "after");
e.addAction("VariableDeclaration", function(s) {console.log("var pre: ", s.type);}, "before");
e.addAction("VariableDeclaration", function(s) {console.log("var post: ", s.type);}, "after");
e.addAction(/.*/, function(n) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      console.log(n.type);
      resolve();
    }, 100);
  });
}, "before");
var test = e.run(script);
test.then(() => {
  console.log("done");
});

// TODO: seems like we have a problem if we don't pass an expected parameter to a function