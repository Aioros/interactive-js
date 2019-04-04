var arr = [];
for (let x = 0; x < 10; x++) {
  arr.push(x);
}

var every = arr.every(function(el) {
  return el >= 0;
});

var allMoreThan1 = arr.filter(function(el) {
  return el > 1;
});

var firstMoreThan1 = arr.find(function(el) {
  return el > 1;
});

var forEachData = [];
arr.forEach(function(el) {
  forEachData.push("");
});

arr = arr.map(function(el) {
  return el*2;
});

var final = arr.reduce((acc, el) => {
  return acc + el;
}, 0);

return {arr, every, allMoreThan1, firstMoreThan1, forEachData, final};