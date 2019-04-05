const Engine = require("./engine.js");

var script = `
/*function *myGen(a, b) {
  var c = 1;
  yield "foo";
  var d = a*b;
  yield d;
  return 0;
}
var it = myGen(2, 3);
console.log(it);
var result = it.next();
console.log(result);*/
function foo() {
  return arguments;
}
return foo(2, 22, 222);
`;

var e = Object.create(Engine);

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

var observers = [];
function drain() {
  while (observers.length > 0) {
    let {node, resolve} = observers[0];
    console.log(
      node.type,
      node.range
        ? node.Engine.script.substring(node.range[0], Math.min(node.range[0] + 20, node.range[1])).replace(/\n/g, "")
        : ""
    );
    resolve();
    observers = observers.slice(1);
  }
}

e.addAction(/.*/, function(n) {
  return new Promise((resolve, reject) => {
    observers.push({node: n, resolve});
  });
}, "before");

process.stdin.on("data", (key) => {
  drain();
  if (key == "q")
    process.exit();
});

setInterval(drain, 10);

e.run(script, {console})
  .then((completion) => {
    console.log(completion.getCompletionValue(), "done, press q to exit");
  })
  .catch((e) => {
    console.error(e);
  })
