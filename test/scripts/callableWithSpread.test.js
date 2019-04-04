function foo(a, ...b) {
  var c = {first: a, others: b};
  return c;
}

var x = [1, 2, 3, 4, 5];
var y = foo(...x);

return y;