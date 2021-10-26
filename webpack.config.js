module.exports = {
  entry: "./src/client/js/main.js",
  output: {
    path: require("path").resolve("./src/bin/client/js"),
    library: "main",
    filename: "main.js",
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: [{ loader: "babel-loader" }],
      },
    ],
  },
};
