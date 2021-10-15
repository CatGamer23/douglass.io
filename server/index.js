// Imports
const express = require("express");
const process = require("process");

// Variables
const app = express();
const port = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Douglass.io listening at http://127.0.0.1:${port}`);
});
