const util = require("util");

function ExpValue(value) {
	return {
		value: value,
		unwrap: function() {
			return this.value;
		},
    [Symbol.toStringTag]: "ExpValue",
    [util.inspect.custom]: function() {
      return "[ExpValue: " + this.value + "]";
    }
	}
}

module.exports = ExpValue;