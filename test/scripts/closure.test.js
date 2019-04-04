function multiplyBy(n) {
  return function(x) {
    return n*x;
  }
}

var triple = multiplyBy(3);
var x = triple(3);
return x;