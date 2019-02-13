const Engine = require("./engine.js");

var script = `
var p = new Promise((resolve, reject) => {
  console.log("inside executor");
  console.log(resolve);
  resolve("foo");
});
console.log("p: ", p);
var p2 = p.then((result) => {
  console.log("RESULT: " + result);
  return new Promise((resolve, reject) => {
    resolve("bar");
  });
});
console.log("p2: ", p2);
var p3 = p2.then((result2) => {
  console.log("RESULT2: " + result2);
});
console.log("p3: ", p3);
`;

var e = Object.create(Engine);
/*e.addAction("CallExpression", function(e) {console.log("call pre: ", e.type);}, "before");
e.addAction("CallExpression", function(e) {console.log("call post: ", e.type);}, "after");
e.addAction("VariableDeclaration", function(s) {console.log("var pre: ", s.type);}, "before");
e.addAction("VariableDeclaration", function(s) {console.log("var post: ", s.type);}, "after");*/
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
