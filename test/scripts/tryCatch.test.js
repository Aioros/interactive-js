function divide(a, b) {
  return a/b;
}
var result = [];
try {
  var foo = divide(4, 2);
} catch(err) {
  foo *= 2;
} finally {
  result.push(foo);
}
try {
  var foo = divide(4, bar);
} catch(err) {
  result.push(1);
}
try {
  var foo = divide(4, 1);
  throw 3;
} catch(err) {
  result.push(err);
}
return result;