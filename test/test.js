const expect = require("chai").expect;
const should = require("chai").should();

const fs = require('fs');

const Engine = require("../engine.js");

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
    }).then((result) => {
      expect(result.type).to.equal("return");
      expect(result.value.value).to.equal(6);
    });
  });

  it("Should manage a function call with a spread element correctly", function() {
    return readFile("./scripts/callableWithSpread.test.js").then((script) => {
      var e = Object.create(Engine);
      return e.run(script);
    }).then((result) => {
      expect(result.type).to.equal("return");
      result = result.value.value;
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
    }).then((result) => {
      expect(result.type).to.equal("return");
      expect(result.value.value).to.be.an("object");
      expect(result.value.value).to.have.property("arr").which.is.an("array");
      expect(result.value.value).to.have.property("every", true);
      expect(result.value.value).to.have.property("allMoreThan1").with.lengthOf(8);
      expect(result.value.value).to.have.property("firstMoreThan1", 2);
      expect(result.value.value).to.have.property("forEachData").with.lengthOf(10);
      expect(result.value.value).to.have.property("final", 90);
    });
  });

  it("Should manage closures correctly", function() {
    readFile("./scripts/closure.test.js", (err, script) => {
      var e = Object.create(Engine);
      e.run(script)
        .then((result) => {
          expect(result.type).to.equal("return");
          expect(result.value.value).to.equal(9);
        });
    });
  });


});
