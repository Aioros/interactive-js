const Engine = require("./engine.js");

var script = `
function foo(a=1) {
	console.log(a);
}

foo();
`;
var e = Object.create(Engine);
e.addAction("CallExpression", function(e) {console.log("call pre: ", e.type);}, "before");
e.addAction("CallExpression", function(e) {console.log("call post: ", e.type);}, "after");
e.addAction("VariableDeclaration", function(s) {console.log("var pre: ", s.type/*, s.declarations[0]*/);}, "before");
e.addAction("VariableDeclaration", function(s) {console.log("var post: ", s.type);}, "after");
e.addAction(/.*/, function(n) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      console.log(n.type);
      resolve();
    }, 10);
  });
}, "before");

e.run(script, {console})
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
  })
