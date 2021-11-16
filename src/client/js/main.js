// Imports
const io = require("socket.io-client");
const ChatClient = require("./chat-client.js");
const Canvas = require("./canvas.js");
const config = require("./config.js");

// Variables
var playerNameInput = document.getElementById("playerNameInput");
var socket;
var reason;

// Canvas Size
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

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
  window.chat.socket = socket;
  window.chat.registerFunctions();
  window.canvas.socket = socket;
  config.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
  var regex = /^\w*$/;
  return regex.exec(playerNameInput.value) !== null;
}

window.onload = () => {
  const startButton = document.getElementById("startButton");
  const spectateButton = document.getElementById("spectateButton");
  const nickErrorText = document.querySelector("#startMenu .input-error");

  socket.emit("getSkins");

  spectateButton.onclick = () => {
    startGame("spectate");
  };

  startButton.onclick = () => {
    // Checks if the nick is valid.
    if (validNick()) {
      nickErrorText.style.opacity = 0;
      startGame("player");
    } else {
      nickErrorText.style.opacity = 1;
    }
  };

  const settingsMenu = document.getElementById("settingsButton");
  const settings = document.getElementById("settings");

  settingsMenu.onclick = () => {
    if (settings.style.maxHeight == "300px") {
      settings.style.maxHeight = "0px";
    } else {
      settings.style.maxHeight = "300px";
    }
  };

  const skinSelectorMenu = document.getElementById("skinSelectorButton");
  const skinSelector = document.getElementById("skinSelector");

  skinSelectorMenu.onclick = () => {
    if (skinSelector.style.maxHeight == "300px") {
      skinSelector.style.maxHeight = "0px";
    } else {
      skinSelector.style.maxHeight = "300px";
    }
  };

  playerNameInput.addEventListener("keypress", (e) => {
    const key = e.key;

    if (key === config.KEY_ENTER) {
      if (validNick()) {
        nickErrorText.style.opacity = 0;
        startGame("player");
      } else {
        nickErrorText.style.opacity = 1;
      }
    }
  });
};

// TODO: Break out into GameControls.

var foodConfig = {
  border: 0,
};

var playerConfig = {
  border: 6,
  textColor: "#FFFFFF",
  textBorder: "#000000",
  textBorderSize: 3,
  defaultSize: 30,
};

var player = {
  id: -1,
  x: config.screenWidth / 2,
  y: config.screenHeight / 2,
  screenWidth: config.screenWidth,
  screenHeight: config.screenHeight,
  target: { x: config.screenWidth / 2, y: config.screenHeight / 2 },
};
config.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = { x: player.x, y: player.y };
config.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

const visibleBorderSetting = document.getElementById("visBord");
visibleBorderSetting.onchange = settings.toggleBorder;

const showMassSetting = document.getElementById("showMass");
showMassSetting.onchange = settings.toggleMass;

const continuitySetting = document.getElementById("continuity");
continuitySetting.onchange = settings.toggleContinuity;

const roundFoodSetting = document.getElementById("roundFood");
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.canvas;
var graph = c.getContext("2d");

$("#feed").click(() => {
  socket.emit("1");
  window.canvas.reenviar = false;
});

$("#split").click(() => {
  socket.emit("2");
  window.canvas.reenviar = false;
});

// socket stuff.
function setupSocket(socket) {
  // Handle ping.
  socket.on("pongcheck", () => {
    var latency = Date.now() - config.startPingTime;
    window.chat.addSystemLine("Ping: " + latency + "ms");
  });

  // Handle error.
  socket.on("connect_failed", () => {
    socket.close();
    config.disconnected = true;
  });

  socket.on("disconnect", () => {
    socket.close();
    config.disconnected = true;
  });

  // Handle connection.
  socket.on("welcome", (playerSettings) => {
    player = playerSettings;
    player.name = config.playerName;
    player.screenWidth = config.screenWidth;
    player.screenHeight = config.screenHeight;
    player.target = window.canvas.target;
    config.player = player;
    window.chat.player = player;
    socket.emit("gotit", player);
    config.gameStart = true;
    window.chat.addSystemLine("Connected to the game!");
    window.chat.addSystemLine("Type <b>-help</b> for a list of commands.");
    if (config.mobile) {
      document.getElementById("chatbox").remove();
    }
    c.focus();
  });

  socket.on("gameSetup", (data) => {
    config.gameWidth = data.gameWidth;
    config.gameHeight = data.gameHeight;
    resize();
  });

  socket.on("playerDied", (data) => {
    window.chat.addSystemLine(
      "{GAME} - <b>" +
        (data.name.length < 1 ? "An unnamed cell" : data.name) +
        "</b> was eaten."
    );
  });

  socket.on("playerDisconnect", (data) => {
    window.chat.addSystemLine(
      "{GAME} - <b>" +
        (data.name.length < 1 ? "An unnamed cell" : data.name) +
        "</b> disconnected."
    );
  });

  socket.on("playerJoin", (data) => {
    window.chat.addSystemLine(
      "{GAME} - <b>" +
        (data.name.length < 1 ? "An unnamed cell" : data.name) +
        "</b> joined."
    );
  });

  socket.on("leaderboard", (data) => {
    leaderboard = data.leaderboard;
    var status = '<span class="title">Leaderboard</span>';
    for (var i = 0; i < leaderboard.length; i++) {
      status += "<br />";
      if (leaderboard[i].id == player.id) {
        if (leaderboard[i].name.length !== 0)
          status +=
            '<span class="me">' +
            (i + 1) +
            ". " +
            leaderboard[i].name +
            "</span>";
        else
          status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
      } else {
        if (leaderboard[i].name.length !== 0)
          status += i + 1 + ". " + leaderboard[i].name;
        else status += i + 1 + ". An unnamed cell";
      }
    }
    // status += '<br />Players: ' + data.players;
    document.getElementById("status").innerHTML = status;
  });

  socket.on("serverMSG", (data) => {
    window.chat.addSystemLine(data);
  });

  // Chat.
  socket.on("serverSendPlayerChat", (data) => {
    window.chat.addChatLine(data.sender, data.message, false);
  });

  // Handle movement.
  socket.on(
    "serverTellPlayerMove",
    (userData, foodsList, massList, virusList) => {
      var playerData;
      for (var i = 0; i < userData.length; i++) {
        if (typeof userData[i].id == "undefined") {
          playerData = userData[i];
          i = userData.length;
        }
      }
      if (config.playerType == "player") {
        var xoffset = player.x - playerData.x;
        var yoffset = player.y - playerData.y;

        player.x = playerData.x;
        player.y = playerData.y;
        player.hue = playerData.hue;
        player.massTotal = playerData.massTotal;
        player.cells = playerData.cells;
        player.xoffset = isNaN(xoffset) ? 0 : xoffset;
        player.yoffset = isNaN(yoffset) ? 0 : yoffset;
      }
      users = userData;
      foods = foodsList;
      viruses = virusList;
      fireFood = massList;
    }
  );

  // Death.
  socket.on("RIP", () => {
    config.gameStart = false;
    config.died = true;
    window.setTimeout(() => {
      document.getElementById("gameAreaWrapper").style.opacity = 0;
      document.getElementById("startMenuWrapper").style.maxHeight = "1000px";
      config.died = false;
      if (config.animLoopHandle) {
        window.cancelAnimationFrame(config.animLoopHandle);
        config.animLoopHandle = undefined;
      }
    }, 75);
  });

  socket.on("kick", (data) => {
    config.gameStart = false;
    reason = data;
    config.kicked = true;
    socket.close();
  });

  socket.on("virusSplit", (virusCell) => {
    socket.emit("2", virusCell);
    reenviar = false;
  });

  socket.on("skinResponse", (fileBase64) => {
    const skinList = document.getElementById("skinList");
    skinList.appendChild(document.createElement("img")).src = "data:image/png;base64," + fileBase64;
  });
}

function drawCircle(centerX, centerY, radius, sides) {
  var theta = 0;
  var x = 0;
  var y = 0;

  graph.beginPath();

  for (var i = 0; i < sides; i++) {
    theta = (i / sides) * 2 * Math.PI;
    x = centerX + radius * Math.sin(theta);
    y = centerY + radius * Math.cos(theta);
    graph.lineTo(x, y);
  }

  graph.closePath();
  graph.stroke();
  graph.fill();
}

function drawFood(food) {
  graph.strokeStyle = "hsl(" + food.hue + ", 100%, 45%)";
  graph.fillStyle = "hsl(" + food.hue + ", 100%, 50%)";
  graph.lineWidth = foodConfig.border;
  drawCircle(
    food.x - player.x + config.screenWidth / 2,
    food.y - player.y + config.screenHeight / 2,
    food.radius,
    config.foodSides
  );
}

function drawVirus(virus) {
  graph.strokeStyle = virus.stroke;
  graph.fillStyle = virus.fill;
  graph.lineWidth = virus.strokeWidth;
  drawCircle(
    virus.x - player.x + config.screenWidth / 2,
    virus.y - player.y + config.screenHeight / 2,
    virus.radius,
    config.virusSides
  );
}

function drawFireFood(mass) {
  graph.strokeStyle = "hsl(" + mass.hue + ", 100%, 45%)";
  graph.fillStyle = "hsl(" + mass.hue + ", 100%, 50%)";
  graph.lineWidth = playerConfig.border + 10;
  drawCircle(
    mass.x - player.x + config.screenWidth / 2,
    mass.y - player.y + config.screenHeight / 2,
    mass.radius - 5,
    18 + ~~(mass.masa / 5)
  );
}

function drawPlayers(order) {
  var start = {
    x: player.x - config.screenWidth / 2,
    y: player.y - config.screenHeight / 2,
  };

  for (var z = 0; z < order.length; z++) {
    var userCurrent = users[order[z].nCell];
    var cellCurrent = users[order[z].nCell].cells[order[z].nDiv];

    var x = 0;
    var y = 0;

    var points = 30 + ~~(cellCurrent.mass / 5);
    var increase = (Math.PI * 2) / points;

    graph.strokeStyle = "hsl(" + userCurrent.hue + ", 100%, 45%)";
    graph.fillStyle = "hsl(" + userCurrent.hue + ", 100%, 50%)";
    graph.lineWidth = playerConfig.border;

    var xstore = [];
    var ystore = [];

    config.spin += 0.0;

    var circle = {
      x: cellCurrent.x - start.x,
      y: cellCurrent.y - start.y,
    };

    for (var i = 0; i < points; i++) {
      x = cellCurrent.radius * Math.cos(config.spin) + circle.x;
      y = cellCurrent.radius * Math.sin(config.spin) + circle.y;
      if (typeof userCurrent.id == "undefined") {
        x = valueInRange(
          -userCurrent.x + config.screenWidth / 2,
          config.gameWidth - userCurrent.x + config.screenWidth / 2,
          x
        );
        y = valueInRange(
          -userCurrent.y + config.screenHeight / 2,
          config.gameHeight - userCurrent.y + config.screenHeight / 2,
          y
        );
      } else {
        x = valueInRange(
          -cellCurrent.x -
            player.x +
            config.screenWidth / 2 +
            cellCurrent.radius / 3,
          config.gameWidth -
            cellCurrent.x +
            config.gameWidth -
            player.x +
            config.screenWidth / 2 -
            cellCurrent.radius / 3,
          x
        );
        y = valueInRange(
          -cellCurrent.y -
            player.y +
            config.screenHeight / 2 +
            cellCurrent.radius / 3,
          config.gameHeight -
            cellCurrent.y +
            config.gameHeight -
            player.y +
            config.screenHeight / 2 -
            cellCurrent.radius / 3,
          y
        );
      }
      config.spin += increase;
      xstore[i] = x;
      ystore[i] = y;
    }
    /*if (wiggle >= player.radius/ 3) inc = -1;
     *if (wiggle <= player.radius / -3) inc = +1;
     *wiggle += inc;
     */
    for (i = 0; i < points; ++i) {
      if (i === 0) {
        graph.beginPath();
        graph.moveTo(xstore[i], ystore[i]);
      } else if (i > 0 && i < points - 1) {
        graph.lineTo(xstore[i], ystore[i]);
      } else {
        graph.lineTo(xstore[i], ystore[i]);
        graph.lineTo(xstore[0], ystore[0]);
      }
    }
    graph.lineJoin = "round";
    graph.lineCap = "round";
    graph.fill();
    graph.stroke();
    var nameCell = "";
    if (typeof userCurrent.id == "undefined") nameCell = player.name;
    else nameCell = userCurrent.name;

    var fontSize = Math.max(cellCurrent.radius / 3, 12);
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = "round";
    graph.textAlign = "center";
    graph.textBaseline = "middle";
    graph.font = "bold " + fontSize + "px sans-serif";

    if (config.toggleMassState === 0) {
      graph.strokeText(nameCell, circle.x, circle.y);
      graph.fillText(nameCell, circle.x, circle.y);
    } else {
      graph.strokeText(nameCell, circle.x, circle.y);
      graph.fillText(nameCell, circle.x, circle.y);
      graph.font = "bold " + Math.max((fontSize / 3) * 2, 10) + "px sans-serif";
      if (nameCell.length === 0) fontSize = 0;
      graph.strokeText(
        Math.round(cellCurrent.mass),
        circle.x,
        circle.y + fontSize
      );
      graph.fillText(
        Math.round(cellCurrent.mass),
        circle.x,
        circle.y + fontSize
      );
    }
  }
}

function valueInRange(min, max, value) {
  return Math.min(max, Math.max(min, value));
}

function drawgrid() {
  graph.lineWidth = 1;
  graph.strokeStyle = config.lineColor;
  graph.configAlpha = 0.15;
  graph.beginPath();

  for (
    var x = config.xoffset - player.x;
    x < config.screenWidth;
    x += config.screenHeight / 18
  ) {
    graph.moveTo(x, 0);
    graph.lineTo(x, config.screenHeight);
  }

  for (
    var y = config.yoffset - player.y;
    y < config.screenHeight;
    y += config.screenHeight / 18
  ) {
    graph.moveTo(0, y);
    graph.lineTo(config.screenWidth, y);
  }

  graph.stroke();
  graph.configAlpha = 1;
}

function drawborder() {
  graph.lineWidth = 1;
  graph.strokeStyle = playerConfig.borderColor;

  // Left-vertical.
  if (player.x <= config.screenWidth / 2) {
    graph.beginPath();
    graph.moveTo(
      config.screenWidth / 2 - player.x,
      0 ? player.y > config.screenHeight / 2 : config.screenHeight / 2 - player.y // prettier-ignore
    );
    graph.lineTo(
      config.screenWidth / 2 - player.x,
      config.gameHeight + config.screenHeight / 2 - player.y
    );
    graph.strokeStyle = config.lineColor;
    graph.stroke();
  }

  // Top-horizontal.
  if (player.y <= config.screenHeight / 2) {
    graph.beginPath();
    graph.moveTo(
      0 ? player.x > config.screenWidth / 2 : config.screenWidth / 2 - player.x, // prettier-ignore
      config.screenHeight / 2 - player.y
    );
    graph.lineTo(
      config.gameWidth + config.screenWidth / 2 - player.x,
      config.screenHeight / 2 - player.y
    );
    graph.strokeStyle = config.lineColor;
    graph.stroke();
  }

  // Right-vertical.
  if (config.gameWidth - player.x <= config.screenWidth / 2) {
    graph.beginPath();
    graph.moveTo(
      config.gameWidth + config.screenWidth / 2 - player.x,
      config.screenHeight / 2 - player.y
    );
    graph.lineTo(
      config.gameWidth + config.screenWidth / 2 - player.x,
      config.gameHeight + config.screenHeight / 2 - player.y
    );
    graph.strokeStyle = config.lineColor;
    graph.stroke();
  }

  // Bottom-horizontal.
  if (config.gameHeight - player.y <= config.screenHeight / 2) {
    graph.beginPath();
    graph.moveTo(
      config.gameWidth + config.screenWidth / 2 - player.x,
      config.gameHeight + config.screenHeight / 2 - player.y
    );
    graph.lineTo(
      config.screenWidth / 2 - player.x,
      config.gameHeight + config.screenHeight / 2 - player.y
    );
    graph.strokeStyle = config.lineColor;
    graph.stroke();
  }
}

window.requestAnimFrame = (() => {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    ((callback) => {
      window.setTimeout(callback, 1000 / 60);
    })
  );
})();

window.cancelAnimFrame = ((handle) => {
  return window.cancelAnimationFrame || window.mozCancelAnimationFrame;
})();

function animloop() {
  config.animLoopHandle = window.requestAnimFrame(animloop);
  gameLoop();
}

function gameLoop() {
  if (config.died) {
    graph.fillStyle = "#333333";
    graph.fillRect(0, 0, config.screenWidth, config.screenHeight);

    graph.textAlign = "center";
    graph.fillStyle = "#FFFFFF";
    graph.font = "bold 30px sans-serif";
    graph.fillText(
      "You died!",
      config.screenWidth / 2,
      config.screenHeight / 2
    );
  }

  if (!config.disconnected) {
    if (config.gameStart) {
      graph.fillStyle = config.backgroundColor;
      graph.fillRect(0, 0, config.screenWidth, config.screenHeight);

      drawgrid();
      foods.forEach(drawFood);
      fireFood.forEach(drawFireFood);
      viruses.forEach(drawVirus);

      if (config.borderDraw) {
        drawborder();
      }
      var orderMass = [];
      for (var i = 0; i < users.length; i++) {
        for (var j = 0; j < users[i].cells.length; j++) {
          orderMass.push({
            nCell: i,
            nDiv: j,
            mass: users[i].cells[j].mass,
          });
        }
      }
      orderMass.sort((obj1, obj2) => {
        return obj1.mass - obj2.mass;
      });

      drawPlayers(orderMass);
      socket.emit("0", window.canvas.target); // playerSendTarget "Heartbeat".
    } else {
      graph.fillStyle = "#333333";
      graph.fillRect(0, 0, config.screenWidth, config.screenHeight);

      graph.textAlign = "center";
      graph.fillStyle = "#FFFFFF";
      graph.font = "bold 30px sans-serif";
      graph.fillText(
        "Game Over!",
        config.screenWidth / 2,
        config.screenHeight / 2
      );
    }
  } else {
    graph.fillStyle = "#333333";
    graph.fillRect(0, 0, config.screenWidth, config.screenHeight);

    graph.textAlign = "center";
    graph.fillStyle = "#FFFFFF";
    graph.font = "bold 30px sans-serif";
    if (config.kicked) {
      if (reason !== "") {
        graph.fillText(
          "You were kicked for:",
          config.screenWidth / 2,
          config.screenHeight / 2 - 20
        );
        graph.fillText(
          reason,
          config.screenWidth / 2,
          config.screenHeight / 2 + 20
        );
      } else {
        graph.fillText(
          "You were kicked!",
          config.screenWidth / 2,
          config.screenHeight / 2
        );
      }
    } else {
      graph.fillText(
        "Disconnected!",
        config.screenWidth / 2,
        config.screenHeight / 2
      );
    }
  }
}

window.addEventListener("resize", resize);

function resize() {
  if (!socket) return;

  player.screenWidth =
    c.width =
    config.screenWidth =
      config.playerType == "player" ? window.innerWidth : config.gameWidth;
  player.screenHeight =
    c.height =
    config.screenHeight =
      config.playerType == "player" ? window.innerHeight : config.gameHeight;

  if (config.playerType == "spectate") {
    player.x = config.gameWidth / 2;
    player.y = config.gameHeight / 2;
  }

  socket.emit("windowResized", {
    screenWidth: config.screenWidth,
    screenHeight: config.screenHeight,
  });
}
