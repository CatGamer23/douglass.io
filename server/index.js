// Imports
const express = require("express");
const process = require("process");
const fs = require("fs");
var config = require("../config.json");

// Variables
const app = express();
const port = process.env.PORT || config.port;

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Douglass.io listening at http://127.0.0.1:${port}`);
});

io.on("connection", function (socket) {
  console.log("Somebody connected!");
  // Write your code here
});
