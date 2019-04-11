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

function *multiple() {
  var x = yield 2;
  z++;
  var y = yield (x * z);
}
var z = 1;
var it1 = multiple();
var it2 = multiple();
var val1 = it1.next().value;
var val2 = it2.next().value;
val1 = it1.next( val2 * 10 ).value;
val2 = it2.next( val1 * 5 ).value;
result.push([val1, val2]);

function *foo() {
  yield 3;
  yield 4;
}
function *bar() {
  yield 1;
  yield 2;
  yield *foo();
  yield 5;
}
var it = bar();
it.next();
it.next();
it.next();
it.next();
result.push(it.next().value);

return result;