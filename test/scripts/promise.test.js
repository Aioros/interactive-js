var p1 = new Promise((resolve, reject) => {
  resolve(42);
}).then(answer => {
  return "The answer is " + answer;
});

var p2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(42);
  }, 100);
}).then(answer => {
  return "The answer is " + answer;
});

return [p1, p2];