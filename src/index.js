const Engine = require("./engine.js");

module.exports = {
  getEngine: function() {
    return Object.create(Engine);
  }
};