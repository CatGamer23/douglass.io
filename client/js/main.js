// Imports
const io = require("socket.io-client");
const config = require("./config.js");

// Variables
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const playerNameInput = document.getElementById("playerNameInput");
var socket;

// Canvas Size
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

// Checks if the device is mobile
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
  config.mobile = true;
}

function startGame(type) {
  config.playerName = playerNameInput.value
    .replace(/(<([^>]+)>)/gi, "")
    .substring(0, 25);
  config.playerType = type;

  config.screenWidth = window.innerWidth;
  config.screenHeight = window.innerHeight;

  document.getElementById("startMenuWrapper").style.maxHeight = "0px";
  document.getElementById("gameAreaWrapper").style.opacity = 1;
  if (!socket) {
    socket = io({ query: "type=" + type });
    setupSocket(socket);
  }
  if (!config.animLoopHandle) animloop();
  socket.emit("respawn");
  // window.chat.socket = socket;
  // window.chat.registerFunctions();
  // window.canvas.socket = socket;
  global.socket = socket;
}

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
    console.log("Clicked: " + playerNameInput.value);
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
    var key = e.code;

    if (key === config.KEY_ENTER) {
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
