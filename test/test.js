const expect = require("chai").expect;
const should = require("chai").should();

const fs = require('fs');

const Engine = require("../engine.js");
const Completion = require("../lib/completion.js");

function readFile(path) {
  var filename = require.resolve(path);
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, script) => {
      if (err)
        reject(err);
      else
        resolve(script);
    });
  });
}

describe("Suite of random scripts that I should organize much better", function() {
  
  it("Should manage basic math and functionality correctly", function() {
    return readFile("./scripts/basicMath.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.type).to.equal("return");
      expect(completion.getCompletionValue()).to.equal(6);
    });
  });

  it("Should manage a function call with a spread element correctly", function() {
    return readFile("./scripts/callableWithSpread.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.type).to.equal("return");
      var result = completion.getCompletionValue();
      expect(result).to.be.an("object");
      expect(result).to.have.property("first", 1);
      expect(result).to.have.property("others");
      expect(result.others).to.be.an("array");
    });
  });

  it("Should run array methods correctly", function() {
    return readFile("./scripts/arrayMethods.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.type).to.equal("return");
      var result = completion.getCompletionValue();
      expect(result).to.be.an("object");
      expect(result).to.have.property("arr").which.is.an("array");
      expect(result).to.have.property("every", true);
      expect(result).to.have.property("allMoreThan1").with.lengthOf(8);
      expect(result).to.have.property("firstMoreThan1", 2);
      expect(result).to.have.property("forEachData").with.lengthOf(10);
      expect(result).to.have.property("final", 90);
    });
  });

  it("Should manage closures correctly", function() {
    return readFile("./scripts/closure.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.type).to.equal("return");
      expect(completion.getCompletionValue()).to.equal(9);
    });
  });

  it("Should manage new and prototypes correctly", function() {
    return readFile("./scripts/newWithPrototype.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.type).to.equal("return");
      var result = completion.getCompletionValue();
      expect(result).to.be.an("object");
      expect(result).to.have.property("bar", "bar");
      expect(result).to.have.property("protoprop", 1);
    });
  });

  it("Should manage promises correctly", function() {
    return readFile("./scripts/promise.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      expect(completion.getCompletionValue()).to.be.an("array");
      var [resolved, unresolved] = completion.getCompletionValue();
      expect(unresolved).to.be.an("object");
      expect(unresolved).to.have.property("__NPO__", 1);
      expect(resolved).to.be.an("object");
      expect(resolved).to.have.property("__NPO__", 1);
      expect(resolved).to.have.property("__MSG__", "The answer is 42");
    });
  });

  it("Should manage generators correctly", function() {
    return readFile("./scripts/generator.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((completion) => {
      var result = completion.getCompletionValue();
      expect(result).to.be.an("object");
      expect(result).to.have.property("value", 21);
      expect(result).to.have.property("done", true);
    });
  });

});
