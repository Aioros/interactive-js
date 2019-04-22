const util = require("util");

function Completion(type, value, target) {
	return {
		type: type,
		value: value && value.unwrap ? value.unwrap() : value,
    target: target,
    getCompletionValue: function() {
      return this.value;
    },
    getReturnValue: function() {
      if (this.type == "return")
        return this.value;
      if (this.type == "error")
        throw this.value;
    },
    [Symbol.toStringTag]: "Completion",
    [util.inspect.custom]: function() {
      return "[Completion - " + this.type + ": " + this.value + "]";
    }
	}
}

module.exports = Completion;