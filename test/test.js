const expect = require("chai").expect;
const should = require("chai").should();

const fs = require('fs');

const Engine = require("../engine.js");

function readFile(path, callback) {
  try {
    var filename = require.resolve(path);
    fs.readFile(filename, 'utf8', callback);
  } catch (e) {
    callback(e);
  }
}

describe("Suite of random scripts that I should organize much better", function() {
  
  it("Should run script1 and return the correct value", function() {
    readFile("./scripts/script1.js", (err, script) => {
      var e = Object.create(Engine);
      e.run(script)
        .then((result) => {
          expect(result.type).to.equal("return");
          expect(result.value.value).to.equal(6);
        });
    });
  });

  it("Should run script2 and return the correct value", function() {
    readFile("./scripts/script2.js", (err, script) => {
      var e = Object.create(Engine);
      e.run(script)
        .then((result) => {
          expect(result.type).to.equal("return");
          result = result.value.value;
          expect(result).to.be.an("object");
          expect(result).to.have.property("first", 1);
          expect(result).to.have.property("others");
          expect(result.others).to.be.an("array");
        });
    });
  });

});
