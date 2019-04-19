const util = require("util");

function Identifier(value, type="var") {
  // Don't rewrap
  if (value && value[Symbol.toStringTag] == "Identifier") {
    return value;
  }
  return {
    value: value,
    type: type,
    [Symbol.toStringTag]: "Identifier",
    [util.inspect.custom]: function() {
      return "[Identifier: " + this.type + " " + this.value + "]";
    }
  }
}

module.exports = Identifier;