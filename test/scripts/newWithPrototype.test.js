function Foo(bar) {
  this.bar = bar;
}
Foo.prototype = {
  protoprop: 1
};
var bar = new Foo("bar");
return bar;