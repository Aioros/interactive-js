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
var x = 1, y = 2;
var z = x + y;
return z*2;
`;

var e = Object.create(Engine);

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

var observers = [];
function drain() {
  while (observers.length > 0) {
    let {node, resolve} = observers[0];
    console.log(node.type);
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
  .then((result) => {
    console.log(result, "done, press q to exit");
  })
  .catch((e) => {
    console.error(e);
  })
