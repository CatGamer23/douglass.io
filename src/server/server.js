// TODO: Fix spectator mode
// TODO: Fix splitting causing hitbox to not update
// TODO: Finish adding skins (applying selection)

// Module Imports
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const SAT = require("sat");
const sql = require("mysql");
const quadtree = require("simple-quadtree");
const fs = require("fs");

// Import game settings.
const config = require("./../config.json");

// Import utilities.
const util = require("./util");

// Call sqlinfo
const sqlDB = config.sqlinfo;

// Variables
var tree = quadtree(0, 0, config.gameWidth, config.gameHeight);
var users = [];
var massFood = [];
var food = [];
var virus = [];
var sockets = {};
var leaderboard = [];
var leaderboardChanged = false;

if (sqlDB.host !== "DEFAULT") {
  var pool = sql.createConnection({
    host: sqlDB.host,
    user: sqlDB.user,
    password: sqlDB.password,
    database: sqlDB.database,
  });

  //log sql errors
  pool.connect((err) => {
    if (err) {
      console.log(err);
    }
  });
}

var initMassLog = util.log(config.defaultPlayerMass, config.slowBase);

app.use(express.static(__dirname + "./../client"));

function addFood(toAdd) {
  var radius = util.massToRadius(config.foodMass);
  while (toAdd--) {
    var position = config.foodUniformDisposition ? util.uniformPosition(food, radius) : util.randomPosition(radius); // prettier-ignore
    food.push({
      // Make IDs unique.
      id: (new Date().getTime() + "" + food.length) >>> 0,
      x: position.x,
      y: position.y,
      radius: radius,
      mass: Math.random() + 2,
      hue: Math.round(Math.random() * 360),
    });
  }
}

function addVirus(toAdd) {
  while (toAdd--) {
    var mass = util.randomInRange(
      config.virus.defaultMass.from,
      config.virus.defaultMass.to,
      true
    );
    var radius = util.massToRadius(mass);
    var position = config.virusUniformDisposition ? util.uniformPosition(virus, radius) : util.randomPosition(radius); // prettier-ignore
    virus.push({
      id: (new Date().getTime() + "" + virus.length) >>> 0,
      x: position.x,
      y: position.y,
      radius: radius,
      mass: mass,
      fill: config.virus.fill,
      stroke: config.virus.stroke,
      strokeWidth: config.virus.strokeWidth,
    });
  }
}

function removeFood(toRem) {
  while (toRem--) {
    food.pop();
  }
}

function movePlayer(player) {
  var x = 0,
    y = 0;
  for (var i = 0; i < player.cells.length; i++) {
    var target = {
      x: player.x - player.cells[i].x + player.target.x,
      y: player.y - player.cells[i].y + player.target.y,
    };
    var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
    var deg = Math.atan2(target.y, target.x);
    var slowDown = 1;
    if (player.cells[i].speed <= 6.25) {
      slowDown =
        util.log(player.cells[i].mass, config.slowBase) - initMassLog + 1;
    }

    var deltaY = (player.cells[i].speed * Math.sin(deg)) / slowDown;
    var deltaX = (player.cells[i].speed * Math.cos(deg)) / slowDown;

    if (player.cells[i].speed > 6.25) {
      player.cells[i].speed -= 0.5;
    }
    if (dist < 50 + player.cells[i].radius) {
      deltaY *= dist / (50 + player.cells[i].radius);
      deltaX *= dist / (50 + player.cells[i].radius);
    }
    if (!isNaN(deltaY)) {
      player.cells[i].y += deltaY;
    }
    if (!isNaN(deltaX)) {
      player.cells[i].x += deltaX;
    }
    // Find best solution.
    for (var j = 0; j < player.cells.length; j++) {
      if (j != i && player.cells[i] !== undefined) {
        var distance = Math.sqrt(
          Math.pow(player.cells[j].y - player.cells[i].y, 2) +
          Math.pow(player.cells[j].x - player.cells[i].x, 2)
        );
        var radiusTotal = player.cells[i].radius + player.cells[j].radius;
        if (distance < radiusTotal) {
          if (
            player.lastSplit >
            new Date().getTime() - 1000 * config.mergeTimer
          ) {
            if (player.cells[i].x < player.cells[j].x) {
              player.cells[i].x--;
            } else if (player.cells[i].x > player.cells[j].x) {
              player.cells[i].x++;
            }
            if (player.cells[i].y < player.cells[j].y) {
              player.cells[i].y--;
            } else if (player.cells[i].y > player.cells[j].y) {
              player.cells[i].y++;
            }
          } else if (distance < radiusTotal / 1.75) {
            player.cells[i].mass += player.cells[j].mass;
            player.cells[i].radius = util.massToRadius(player.cells[i].mass);
            player.cells.splice(j, 1);
          }
        }
      }
    }
    if (player.cells.length > i) {
      var borderCalc = player.cells[i].radius / 3;
      if (player.cells[i].x > config.gameWidth - borderCalc) {
        player.cells[i].x = config.gameWidth - borderCalc;
      }
      if (player.cells[i].y > config.gameHeight - borderCalc) {
        player.cells[i].y = config.gameHeight - borderCalc;
      }
      if (player.cells[i].x < borderCalc) {
        player.cells[i].x = borderCalc;
      }
      if (player.cells[i].y < borderCalc) {
        player.cells[i].y = borderCalc;
      }
      x += player.cells[i].x;
      y += player.cells[i].y;
    }
  }
  player.x = x / player.cells.length;
  player.y = y / player.cells.length;
}

function moveMass(mass) {
  var deg = Math.atan2(mass.target.y, mass.target.x);
  var deltaY = mass.speed * Math.sin(deg);
  var deltaX = mass.speed * Math.cos(deg);

  mass.speed -= 0.5;
  if (mass.speed < 0) {
    mass.speed = 0;
  }
  if (!isNaN(deltaY)) {
    mass.y += deltaY;
  }
  if (!isNaN(deltaX)) {
    mass.x += deltaX;
  }

  var borderCalc = mass.radius + 5;

  if (mass.x > config.gameWidth - borderCalc) {
    mass.x = config.gameWidth - borderCalc;
  }
  if (mass.y > config.gameHeight - borderCalc) {
    mass.y = config.gameHeight - borderCalc;
  }
  if (mass.x < borderCalc) {
    mass.x = borderCalc;
  }
  if (mass.y < borderCalc) {
    mass.y = borderCalc;
  }
}

function balanceMass() {
  var totalMass =
    food.length * config.foodMass +
    users.map((u) => u.massTotal).reduce((pu, cu) => pu + cu, 0);

  var massDiff = config.gameMass - totalMass;
  var maxFoodDiff = config.maxFood - food.length;
  var foodDiff = parseInt(massDiff / config.foodMass) - maxFoodDiff;
  var foodToAdd = Math.min(foodDiff, maxFoodDiff);
  var foodToRemove = -Math.max(foodDiff, maxFoodDiff);

  if (foodToAdd > 0) {
    //console.log('[DEBUG] Adding ' + foodToAdd + ' food to level!');
    addFood(foodToAdd);
    //console.log('[DEBUG] Mass rebalanced!');
  } else if (foodToRemove > 0) {
    //console.log('[DEBUG] Removing ' + foodToRemove + ' food from level!');
    removeFood(foodToRemove);
    //console.log('[DEBUG] Mass rebalanced!');
  }

  var virusToAdd = config.maxVirus - virus.length;

  if (virusToAdd > 0) {
    addVirus(virusToAdd);
  }
}

io.on("connection", (socket) => {
  // console.log("A user connected!", socket.handshake.query.type);
  var type = socket.handshake.query.type;
  var radius = util.massToRadius(config.defaultPlayerMass);
  var position = config.newPlayerInitialPosition == "farthest" ? util.uniformPosition(users, radius) : util.randomPosition(radius); // prettier-ignore

  var cells = [];
  var massTotal = 0;
  if (type === "player") {
    cells = [
      {
        mass: config.defaultPlayerMass,
        x: position.x,
        y: position.y,
        radius: radius,
      },
    ];
    massTotal = config.defaultPlayerMass;
  }

  var currentPlayer = {
    id: socket.id,
    x: position.x,
    y: position.y,
    w: config.defaultPlayerMass,
    h: config.defaultPlayerMass,
    cells: cells,
    massTotal: massTotal,
    hue: Math.round(Math.random() * 360),
    type: type,
    lastHeartbeat: new Date().getTime(),
    target: {
      x: 0,
      y: 0,
    },
  };

  socket.on("gotit", (player) => {
    if (player.name) {
      console.log("[INFO] Player " + player.name + " connecting!");
    } else {
      console.log("[INFO] An unnamed cell connecting!");
    }

    if (util.findIndex(users, player.id) > -1) {
      console.log("[INFO] Player ID is already connected, kicking.");
      socket.disconnect();
    } else if (!util.validNick(player.name)) {
      socket.emit("kick", "Invalid username.");
      socket.disconnect();
    } else {
      if (player.name) {
        console.log("[INFO] Player " + player.name + " connected!");
      } else {
        console.log("[INFO] An unnamed cell connected!");
      }
      sockets[player.id] = socket;

      var radius = util.massToRadius(config.defaultPlayerMass);
      var position = config.newPlayerInitialPosition == "farthest" ? util.uniformPosition(users, radius) : util.randomPosition(radius); // prettier-ignore

      player.x = position.x;
      player.y = position.y;
      player.target.x = 0;
      player.target.y = 0;
      if (type === "player") {
        player.cells = [
          {
            mass: config.defaultPlayerMass,
            x: position.x,
            y: position.y,
            radius: radius,
          },
        ];
        player.massTotal = config.defaultPlayerMass;
      } else {
        player.cells = [];
        player.massTotal = 0;
      }
      player.hue = Math.round(Math.random() * 360);
      currentPlayer = player;
      currentPlayer.lastHeartbeat = new Date().getTime();
      users.push(currentPlayer);

      io.emit("playerJoin", { name: currentPlayer.name });

      socket.emit("gameSetup", {
        gameWidth: config.gameWidth,
        gameHeight: config.gameHeight,
      });
      console.log("Total players: " + users.length);
    }
  });

  socket.on("pingcheck", () => {
    socket.emit("pongcheck");
  });

  socket.on("windowResized", (data) => {
    currentPlayer.screenWidth = data.screenWidth;
    currentPlayer.screenHeight = data.screenHeight;
  });

  socket.on("respawn", () => {
    if (util.findIndex(users, currentPlayer.id) > -1)
      users.splice(util.findIndex(users, currentPlayer.id), 1);
    socket.emit("welcome", currentPlayer);
    if (currentPlayer.name) {
      console.log("[INFO] Player " + currentPlayer.name + " respawned!");
    } else {
      console.log("[INFO] An unnamed cell respawned!");
    }
  });

  socket.on("disconnect", () => {
    if (util.findIndex(users, currentPlayer.id) > -1)
      users.splice(util.findIndex(users, currentPlayer.id), 1);
    if (currentPlayer.name) {
      console.log("[INFO] Player " + currentPlayer.name + " disconnected!");
    } else {
      console.log("[INFO] An unnamed cell disconnected!");
    }

    socket.broadcast.emit("playerDisconnect", { name: currentPlayer.name });
  });

  socket.on("playerChat", (data) => {
    var _sender = data.sender.replace(/(<([^>]+)>)/gi, "");
    var _message = data.message.replace(/(<([^>]+)>)/gi, "");
    if (config.logChat === 1) {
      console.log(
        "[CHAT] [" +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        "] " +
        _sender +
        ": " +
        _message
      );
    }
    socket.broadcast.emit("serverSendPlayerChat", {
      sender: _sender,
      message: _message.substring(0, 35),
    });
  });

  socket.on("pass", (data) => {
    if (data[0] === config.adminPass) {
      if (currentPlayer.name) {
        console.log("[ADMIN] " + currentPlayer.name + " just logged in as an admin!");
      } else {
        console.log("[ADMIN] An unnamed cell just logged in as an admin!");
      }
      socket.emit("serverMSG", "Welcome back " + currentPlayer.name);
      socket.broadcast.emit("serverMSG", currentPlayer.name + " just logged in as admin!");
      currentPlayer.admin = true;
    } else {
      if (currentPlayer.name) {
        console.log("[ADMIN] " + currentPlayer.name + " attempted to log in with incorrect password.");
      } else {
        console.log("[ADMIN] An unnamed cell attempted to log in with incorrect password.");
      }
      socket.emit("serverMSG", "Password incorrect, attempt logged.");
      fs.appendFileSync('./logins.md', `|${currentPlayer.name ? currentPlayer.name : "An unnamed cell"}|${new Date().toLocaleString("en-US")}|${data[0] ? data[0] : "N/A"}|\n`);
      // |NAME|DATE|PASSWORD|
      // pool.query("INSERT INTO logging SET name=" + currentPlayer.name + ', reason="Invalid login attempt as admin"');
    }
  });

  socket.on("kick", (data) => {
    if (currentPlayer.admin) {
      var reason = "";
      var worked = false;
      for (var e = 0; e < users.length; e++) {
        if (users[e].name === data[0] && !users[e].admin && !worked) {
          if (data.length > 1) {
            for (var f = 1; f < data.length; f++) {
              if (f === data.length) {
                reason = reason + data[f];
              } else {
                reason = reason + data[f] + " ";
              }
            }
          }
          if (reason !== "") {
            console.log(
              "[ADMIN] User " +
              users[e].name +
              " kicked successfully by " +
              currentPlayer.name +
              " for reason " +
              reason
            );
          } else {
            console.log(
              "[ADMIN] User " +
              users[e].name +
              " kicked successfully by " +
              currentPlayer.name
            );
          }
          socket.emit(
            "serverMSG",
            "User " + users[e].name + " was kicked by " + currentPlayer.name
          );
          sockets[users[e].id].emit("kick", reason);
          sockets[users[e].id].disconnect();
          users.splice(e, 1);
          worked = true;
        }
      }
      if (!worked) {
        socket.emit("serverMSG", "Could not locate user or user is an admin.");
      }
    } else {
      if (currentPlayer.name) {
        console.log("[ADMIN] " + currentPlayer.name + " is trying to use -kick but isn't an admin.");
      } else {
        console.log("[ADMIN] An unnamed cell is trying to use -kick but isn't an admin.");
      }
      socket.emit("serverMSG", "You are not permitted to use this command.");
    }
  });

  // Heartbeat function, update everytime.
  socket.on("0", (target) => {
    currentPlayer.lastHeartbeat = new Date().getTime();
    if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
      currentPlayer.target = target;
    }
  });

  socket.on("1", () => {
    // Fire food.
    for (var i = 0; i < currentPlayer.cells.length; i++) {
      if (
        (currentPlayer.cells[i].mass >=
          config.defaultPlayerMass + config.fireFood &&
          config.fireFood > 0) ||
        (currentPlayer.cells[i].mass >= 20 && config.fireFood === 0)
      ) {
        var masa = 1;
        if (config.fireFood > 0) masa = config.fireFood;
        else masa = currentPlayer.cells[i].mass * 0.1;
        currentPlayer.cells[i].mass -= masa;
        currentPlayer.massTotal -= masa;
        massFood.push({
          id: currentPlayer.id,
          num: i,
          masa: masa,
          hue: currentPlayer.hue,
          target: {
            x:
              currentPlayer.x -
              currentPlayer.cells[i].x +
              currentPlayer.target.x,
            y:
              currentPlayer.y -
              currentPlayer.cells[i].y +
              currentPlayer.target.y,
          },
          x: currentPlayer.cells[i].x,
          y: currentPlayer.cells[i].y,
          radius: util.massToRadius(masa),
          speed: 25,
        });
      }
    }
  });

  socket.on("2", (virusCell) => {
    // Split
    function splitCell(cell) {
      if (cell && cell.mass && cell.mass >= config.defaultPlayerMass * 2) {
        cell.mass = cell.mass / 2;
        cell.radius = util.massToRadius(cell.mass);
        currentPlayer.cells.push({
          mass: cell.mass,
          x: cell.x,
          y: cell.y,
          radius: cell.radius,
          speed: 25,
        });
      }
    }

    if (
      currentPlayer.cells.length < config.limitSplit &&
      currentPlayer.massTotal >= config.defaultPlayerMass * 2
    ) {
      // Split single cell from virus
      if (virusCell) {
        splitCell(currentPlayer.cells[virusCell]);
      } else {
        // Split all cells
        if (
          currentPlayer.cells.length < config.limitSplit &&
          currentPlayer.massTotal >= config.defaultPlayerMass * 2
        ) {
          var numMax = currentPlayer.cells.length;
          for (var d = 0; d < numMax; d++) {
            splitCell(currentPlayer.cells[d]);
          }
        }
      }
      currentPlayer.lastSplit = new Date().getTime();
    }
  });

  // Give list of skins
  socket.on("getSkins", () => {
    fs.readdirSync("./bin/server/skins/").forEach((file) => {
      fs.readFile("./bin/server/skins/" + file, (err, data) => {
        if (err) console.log(err);
        socket.emit(
          "skinResponse",
          "data:image/png;base64," + data.toString("base64"),
          file.split(".")[0]
        );
      });
    });
  });
});

function tickPlayer(currentPlayer) {
  if (
    currentPlayer.lastHeartbeat <
    new Date().getTime() - config.maxHeartbeatInterval
  ) {
    sockets[currentPlayer.id].emit(
      "kick",
      "Last heartbeat received over " + config.maxHeartbeatInterval + " ago."
    );
    sockets[currentPlayer.id].disconnect();
  }

  movePlayer(currentPlayer);

  function funcFood(f) {
    return SAT.pointInCircle(new SAT.Vector(f.x, f.y), playerCircle);
  }

  function deleteFood(f) {
    food[f] = {};
    food.splice(f, 1);
  }

  function eatMass(m) {
    if (SAT.pointInCircle(new SAT.Vector(m.x, m.y), playerCircle)) {
      if (m.id == currentPlayer.id && m.speed > 0 && z == m.num) return false;
      if (currentCell.mass > m.masa * 1.1) return true;
    }
    return false;
  }

  function check(user) {
    for (var i = 0; i < user.cells.length; i++) {
      if (user.cells[i].mass > 10 && user.id !== currentPlayer.id) {
        var response = new SAT.Response();
        var collided = SAT.testCircleCircle(
          playerCircle,
          new SAT.Circle(
            new SAT.Vector(user.cells[i].x, user.cells[i].y),
            user.cells[i].radius
          ),
          response
        );
        if (collided) {
          response.aUser = currentCell;
          response.bUser = {
            id: user.id,
            name: user.name,
            x: user.cells[i].x,
            y: user.cells[i].y,
            num: i,
            mass: user.cells[i].mass,
          };
          playerCollisions.push(response);
        }
      }
    }
    return true;
  }

  function collisionCheck(collision) {
    if (
      collision.aUser.mass > collision.bUser.mass * 1.1 &&
      collision.aUser.radius >
      Math.sqrt(
        Math.pow(collision.aUser.x - collision.bUser.x, 2) +
        Math.pow(collision.aUser.y - collision.bUser.y, 2)
      ) * 1.75
    ) {
      // console.log("[DEBUG] Killing user: " + collision.bUser.id);
      // console.log("[DEBUG] Collision info:");
      // console.log(collision);

      var numUser = util.findIndex(users, collision.bUser.id);
      if (numUser > -1) {
        if (users[numUser].cells.length > 1) {
          users[numUser].massTotal -= collision.bUser.mass;
          users[numUser].cells.splice(collision.bUser.num, 1);
        } else {
          users.splice(numUser, 1);
          io.emit("playerDied", { name: collision.bUser.name });
          sockets[collision.bUser.id].emit("RIP");
        }
      }
      currentPlayer.massTotal += collision.bUser.mass;
      collision.aUser.mass += collision.bUser.mass;
    }
  }

  for (var z = 0; z < currentPlayer.cells.length; z++) {
    var currentCell = currentPlayer.cells[z];
    var playerCircle = new SAT.Circle(
      new SAT.Vector(currentCell.x, currentCell.y),
      currentCell.radius
    );

    var foodEaten = food
      .map(funcFood)
      .reduce((a, b, c) => (b ? a.concat(c) : a), []);

    foodEaten.forEach(deleteFood);

    var massEaten = massFood
      .map(eatMass)
      .reduce((a, b, c) => (b ? a.concat(c) : a), []);

    var virusCollision = virus
      .map(funcFood)
      .reduce((a, b, c) => (b ? a.concat(c) : a), []);

    if (virusCollision > 0 && currentCell.mass > virus[virusCollision].mass) {
      sockets[currentPlayer.id].emit("virusSplit", z);
      virus.splice(virusCollision, 1);
    }

    var earnedMass = 0;
    for (var m = 0; m < massEaten.length; m++) {
      earnedMass += massFood[massEaten[m]].masa;
      massFood[massEaten[m]] = {};
      massFood.splice(massEaten[m], 1);
      for (var n = 0; n < massEaten.length; n++) {
        if (massEaten[m] < massEaten[n]) {
          massEaten[n]--;
        }
      }
    }

    if (typeof currentCell.speed == "undefined") currentCell.speed = 6.25;
    earnedMass += foodEaten.length * config.foodMass;
    currentCell.mass += earnedMass;
    currentPlayer.massTotal += earnedMass;
    currentCell.radius = util.massToRadius(currentCell.mass);
    playerCircle.r = currentCell.radius;

    tree.clear();
    users.forEach(tree.put);
    var playerCollisions = [];

    tree.get(currentPlayer, check);

    playerCollisions.forEach(collisionCheck);
  }
}

function moveloop() {
  for (var i = 0; i < users.length; i++) {
    tickPlayer(users[i]);
  }
  for (i = 0; i < massFood.length; i++) {
    if (massFood[i].speed > 0) moveMass(massFood[i]);
  }
}

function gameloop() {
  if (users.length > 0) {
    users.sort((a, b) => b.massTotal - a.massTotal);

    var topUsers = [];

    for (var i = 0; i < Math.min(10, users.length); i++) {
      if (users[i].type == "player") {
        topUsers.push({
          id: users[i].id,
          name: users[i].name,
        });
      }
    }
    if (isNaN(leaderboard) || leaderboard.length !== topUsers.length) {
      leaderboard = topUsers;
      leaderboardChanged = true;
    } else {
      for (i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i].id !== topUsers[i].id) {
          leaderboard = topUsers;
          leaderboardChanged = true;
          break;
        }
      }
    }
    for (i = 0; i < users.length; i++) {
      for (var z = 0; z < users[i].cells.length; z++) {
        if (
          users[i].cells[z].mass * (1 - config.massLossRate / 1000) >
          config.defaultPlayerMass &&
          users[i].massTotal > config.minMassLoss
        ) {
          var massLoss =
            users[i].cells[z].mass * (1 - config.massLossRate / 1000);
          users[i].massTotal -= users[i].cells[z].mass - massLoss;
          users[i].cells[z].mass = massLoss;
        }
      }
    }
  }
  balanceMass();
}

function sendUpdates() {
  users.forEach((u) => {
    // center the view if x/y is undefined, this will happen for spectators
    u.x = u.x || config.gameWidth / 2;
    u.y = u.y || config.gameHeight / 2;

    var visibleFood = food
      .map((f) => {
        if (
          f.x > u.x - u.screenWidth / 2 - 20 &&
          f.x < u.x + u.screenWidth / 2 + 20 &&
          f.y > u.y - u.screenHeight / 2 - 20 &&
          f.y < u.y + u.screenHeight / 2 + 20
        ) {
          return f;
        }
      })
      .filter((f) => f);

    var visibleVirus = virus
      .map((f) => {
        if (
          f.x > u.x - u.screenWidth / 2 - f.radius &&
          f.x < u.x + u.screenWidth / 2 + f.radius &&
          f.y > u.y - u.screenHeight / 2 - f.radius &&
          f.y < u.y + u.screenHeight / 2 + f.radius
        ) {
          return f;
        }
      })
      .filter((f) => f);

    var visibleMass = massFood
      .map((f) => {
        if (
          f.x + f.radius > u.x - u.screenWidth / 2 - 20 &&
          f.x - f.radius < u.x + u.screenWidth / 2 + 20 &&
          f.y + f.radius > u.y - u.screenHeight / 2 - 20 &&
          f.y - f.radius < u.y + u.screenHeight / 2 + 20
        ) {
          return f;
        }
      })
      .filter((f) => f);

    var visibleCells = users
      .map((f) => {
        for (var z = 0; z < f.cells.length; z++) {
          if (
            f.cells[z].x + f.cells[z].radius > u.x - u.screenWidth / 2 - 20 &&
            f.cells[z].x - f.cells[z].radius < u.x + u.screenWidth / 2 + 20 &&
            f.cells[z].y + f.cells[z].radius > u.y - u.screenHeight / 2 - 20 &&
            f.cells[z].y - f.cells[z].radius < u.y + u.screenHeight / 2 + 20
          ) {
            z = f.cells.lenth;
            if (f.id !== u.id) {
              return {
                id: f.id,
                x: f.x,
                y: f.y,
                cells: f.cells,
                massTotal: Math.round(f.massTotal),
                hue: f.hue,
                name: f.name,
              };
            } else {
              return {
                x: f.x,
                y: f.y,
                cells: f.cells,
                massTotal: Math.round(f.massTotal),
                hue: f.hue,
              };
            }
          }
        }
      })
      .filter((f) => f);

    sockets[u.id].emit(
      "serverTellPlayerMove",
      visibleCells,
      visibleFood,
      visibleMass,
      visibleVirus
    );
    if (leaderboardChanged) {
      sockets[u.id].emit("leaderboard", {
        players: users.length,
        leaderboard: leaderboard,
      });
    }
  });
  leaderboardChanged = false;
}

setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / config.networkUpdateFactor);

// Don't touch, IP configurations.
const ipaddress = process.env.DOUGLASSIO_IP || config.host;
const serverport = process.env.DOUGLASSIO_PORT || config.port;

http.listen(serverport, ipaddress, () => {
  console.log("[DEBUG] Listening on " + ipaddress + ":" + serverport);
});