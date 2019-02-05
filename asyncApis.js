const crypto = require("crypto");

const _setTimeout = setTimeout;

module.exports = function(engine) {
  return {
    setTimeout: function setTimeout(callback, delay) {
    	let id = crypto.randomBytes(16).toString("hex");
    	engine.MessageQueue.addToPending({id});
    	var timeout = _setTimeout(function() {
    	  delete engine.MessageQueue.pending[id];
    	  engine.MessageQueue.add(callback);
    	}, delay);
    },

    setInterval: function setInterval(callback, interval) {
      // TBD
    }
  }
};