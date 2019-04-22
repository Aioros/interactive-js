const util = require("util");

function ExpValue(value, control="normal") {
  // A wrapped value can be rewrapped with a different control type
  if (value && value.unwrap) {
    if (control == value.control)
      return value;
    else
      return ExpValue(value.unwrap(), control);
  }
  return {
    value: value,
    control: control,
    unwrap: function() {
      return this.value;
    },
    [Symbol.toStringTag]: "ExpValue",
    [util.inspect.custom]: function() {
      return "[ExpValue: " + (this.control != "normal" ? this.control+ " - " : "") + this.value + "]";
    }
  }
}

module.exports = ExpValue;