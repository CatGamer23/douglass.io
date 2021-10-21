// Imports
const io = require("socket.io-client");
const config = require("./config");

// Variables
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Canvas Size
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
  var regex = /^\w*$/;
  console.log("Regex Test", regex.exec(playerNameInput.value));
  return regex.exec(playerNameInput.value) !== null;
}

window.onload = () => {
  var startButton = document.getElementById("startButton");
  var spectateButton = document.getElementById("spectateButton");
  var nickErrorText = document.querySelector("#startMenu .input-error");

  spectateButton.onclick = () => {
    startGame("spectate");
  };

  startButton.onclick = () => {
    console.log("Clicked: " + document.getElementById("playerName").value);
    // Checks if the nick is valid.
    if (validNick()) {
      nickErrorText.style.opacity = 0;
      startGame("player");
    } else {
      nickErrorText.style.opacity = 1;
    }
  };

  var settingsMenuButton = document.getElementById("settingsButton");
  var settingsMenu = document.getElementById("settings");

  settingsMenuButton.onclick = () => {
    if (settingsMenu.style.maxHeight == "300px") {
      settingsMenu.style.maxHeight = "0px";
    } else {
      settingsMenu.style.maxHeight = "300px";
    }
  };

  playerNameInput.addEventListener("keypress", (e) => {
    var key = e.which || e.keyCode;

    if (key === global.KEY_ENTER) {
      // Checks if the nick is valid.
      if (validNick()) {
        nickErrorText.style.opacity = 0;
        startGame("player");
      } else {
        nickErrorText.style.opacity = 1;
      }
    }
  });
};
