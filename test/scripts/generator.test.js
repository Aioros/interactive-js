function *myGen(a, b) {
  var c;
  c = yield a*b;
  c = yield c*b;
  return c*b;
}
var it = myGen(1, 3);
console.log(it);
var result = it.next("irrelevant");
result = it.next(2);
result = it.next(7);
return result;