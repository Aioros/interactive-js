const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "interactive.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "interactivejs"
  }
};