const util = require("util");

function Completion(type, value, target) {
	return {
		type: type,
		value: value && value.unwrap ? value.unwrap() : value,
    target: target,
    getCompletionValue: function() {
      return this.value;
    },
    [Symbol.toStringTag]: "Completion",
    [util.inspect.custom]: function() {
      return "[Completion: " + this.value + "]";
    }
	}
}

module.exports = Completion;