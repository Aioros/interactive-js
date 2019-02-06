const crypto = require("crypto");

const _setTimeout = setTimeout;
const [_setInterval, _clearInterval] = [setInterval, clearInterval];

// I'll probably need some kind of deep merge (instead of Object.assign)
// to overwrite things like fs.readFile or anything.else

module.exports = function(engine) {
  return {
    setTimeout: function setTimeout(callback, delay) {
    	let id = crypto.randomBytes(16).toString("hex");
    	engine.MessageQueue.addToPending({id});
    	var timeout = _setTimeout(function() {
    	  delete engine.MessageQueue.pending[id];
    	  engine.MessageQueue.add(callback);
    	}, delay);
      return id;
    },

    clearTimeout: function clearTimeout(id) {
      delete engine.MessageQueue.pending[id];
    },

    setInterval: function setInterval(callback, delay) {
      let id = crypto.randomBytes(16).toString("hex");
      engine.MessageQueue.addToPending({id});
      var interval = _setInterval(function() {
        engine.MessageQueue.add(callback);
      }, delay);
      engine.MessageQueue.pending[id] = interval;
      return id;
    },

    clearInterval: function clearInterval(id) {
      _clearInterval(engine.MessageQueue.pending[id]);
      delete engine.MessageQueue.pending[id];
    }
  }
};