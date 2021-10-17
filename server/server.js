// Imports
const express = require("express");
const app = express();

const http = require("http").Server(app);
const io = require("socket.io")(http);

const process = require("process");
const fs = require("fs");

// Variables
const config = require("../config.json");
const port = process.env.PORT || config.port;

// Main Code
app.use(express.static(__dirname + "/../client"));

io.on("connection", function (socket) {
  console.log("Somebody connected!");
  // Write your serverside code here
});

http.listen(port, () => {
  console.log(`Douglass.io listening at http://127.0.0.1:${port}`);
});
