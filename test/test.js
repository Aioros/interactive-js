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
  readFile("./testscript1.js", (err, script) => {
    var e = Object.create(Engine);
    e.run(script, {console})
      .then((result) => {
        expect(result.type).to.equal("return");
        expect(result.getCompletionValue().unwrap()).to.equal(6);
      });
  });
});
