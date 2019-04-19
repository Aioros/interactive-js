const Engine = require("./engine.js");

var script = `
function *baseGen(a, b) {
  var c;
  c = yield a*b;
  c = yield c*b;
  return c*b;
}
var result = [];
var it = baseGen(1, 3);
it.next("irrelevant");
it.next(2);
result.push(it.next(7));

return result;
`;

var e = Object.create(Engine);

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

e.addAction(/.*/, function(n) {
  return new Promise((resolve, reject) => {
    console.log(n.type);
    setTimeout(resolve, 10);
  });
}, "before");

process.stdin.on("data", (key) => {
  if (key == "q")
    process.exit();
});

e.run(script, {console})
  .then((completion) => {
    console.log(completion, "done, press q to exit");
  })
  .catch((e) => {
    console.error("Uncaught error in main: ", e);
  })
