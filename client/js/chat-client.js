const config = require("./config.js");

class ChatClient {
  constructor(params) {
    this.canvas = config.canvas;
    this.socket = config.socket;
    this.mobile = config.mobile;
    this.player = config.player;
    var self = this;
    this.commands = {};
    const input = document.getElementById("chatInput");
    input.addEventListener("keypress", this.sendChat.bind(this));
    input.addEventListener("keyup", (key) => {
      input = document.getElementById("chatInput");
      key = key.code;
      if (key === config.KEY_ESC) {
        input.value = "";
        self.canvas.cv.focus();
      }
    });
    config.chatClient = this;
  }

  // TODO: Break out many of these GameControls into separate classes.
  registerFunctions() {
    var self = this;
    this.registerCommand("ping", "Check your latency.", () => {
      self.checkLatency();
    });

    this.registerCommand("dark", "Toggle dark mode.", () => {
      self.toggleDarkMode();
    });

    this.registerCommand("border", "Toggle visibility of border.", () => {
      self.toggleBorder();
    });

    this.registerCommand("mass", "Toggle visibility of mass.", () => {
      self.toggleMass();
    });

    this.registerCommand("continuity", "Toggle continuity.", () => {
      self.toggleContinuity();
    });

    this.registerCommand("roundfood", "Toggle food drawing.", (args) => {
      self.toggleRoundFood(args);
    });

    this.registerCommand("help", "Information about the chat commands.", () => {
      self.printHelp();
    });

    this.registerCommand("login", "Login as an admin.", (args) => {
      self.socket.emit("pass", args);
    });

    this.registerCommand("kick", "Kick a player, for admins only.", (args) => {
      self.socket.emit("kick", args);
    });

    config.chatClient = this;
  }

  // Chat box implementation for the users.
  addChatLine(name, message, me) {
    if (this.mobile) {
      return;
    }

    const newline = document.createElement("li");

    // Colours the chat input correctly.
    newline.className = me ? "me" : "friend";
    newline.innerHTML =
      "<b>" + (name.length < 1 ? "An unnamed cell" : name) + "</b>: " + message;

    this.appendMessage(newline);
  }

  // Chat box implementation for the system.
  addSystemLine(message) {
    if (this.mobile) {
      return;
    }

    const newline = document.createElement("li");

    // Colours the chat input correctly.
    newline.className = "system";
    newline.innerHTML = message;

    // Append messages to the logs.
    this.appendMessage(newline);
  }

  // Places the message DOM node into the chat box.
  appendMessage(node) {
    if (this.mobile) {
      return;
    }

    const chatList = document.getElementById("chatList");

    if (chatList.childNodes.length > 10) {
      chatList.removeChild(chatList.childNodes[0]);
    }
    chatList.appendChild(node);
  }

  // Sends a message or executes a command on the click of enter.
  sendChat(key) {
    const commands = this.commands;
    const input = document.getElementById("chatInput");

    key = key.code;

    if (key === config.KEY_ENTER) {
      var text = input.value.replace(/(<([^>]+)>)/gi, "");
      if (text !== "") {
        // Chat command.
        if (text.indexOf("-") === 0) {
          var args = text.substring(1).split(" ");
          if (commands[args[0]]) {
            commands[args[0]].callback(args.slice(1));
          } else {
            this.addSystemLine(
              "Unrecognized Command: " + text + ", type -help for more info."
            );
          }

          // Allows for regular messages to be sent to the server.
        } else {
          this.socket.emit("playerChat", {
            sender: this.player.name,
            message: text,
          });
          this.addChatLine(this.player.name, text, true);
        }

        // Resets input.
        input.value = "";
        this.canvas.cv.focus();
      }
    }
  }

  // Allows for addition of commands.
  registerCommand(name, description, callback) {
    this.commands[name] = {
      description: description,
      callback: callback,
    };
  }

  // Allows help to print the list of all the commands and their descriptions.
  printHelp() {
    var commands = this.commands;
    for (var cmd in commands) {
      if (commands.hasOwnProperty(cmd)) {
        this.addSystemLine("-" + cmd + ": " + commands[cmd].description);
      }
    }
  }

  checkLatency() {
    // Ping.
    config.startPingTime = Date.now();
    this.socket.emit("pingcheck");
  }

  toggleDarkMode() {
    var LIGHT = "#f2fbff",
      DARK = "#181818";
    var LINELIGHT = "#000000",
      LINEDARK = "#ffffff";

    if (config.backgroundColor === LIGHT) {
      config.backgroundColor = DARK;
      config.lineColor = LINEDARK;
      this.addSystemLine("Dark mode enabled.");
    } else {
      config.backgroundColor = LIGHT;
      config.lineColor = LINELIGHT;
      this.addSystemLine("Dark mode disabled.");
    }
  }

  toggleBorder() {
    if (!config.borderDraw) {
      config.borderDraw = true;
      this.addSystemLine("Showing border.");
    } else {
      config.borderDraw = false;
      this.addSystemLine("Hiding border.");
    }
  }

  toggleMass() {
    if (config.toggleMassState === 0) {
      config.toggleMassState = 1;
      this.addSystemLine("Viewing mass enabled.");
    } else {
      config.toggleMassState = 0;
      this.addSystemLine("Viewing mass disabled.");
    }
  }

  toggleContinuity() {
    if (!config.continuity) {
      config.continuity = true;
      this.addSystemLine("Continuity enabled.");
    } else {
      config.continuity = false;
      this.addSystemLine("Continuity disabled.");
    }
  }

  toggleRoundFood(args) {
    if (args || config.foodSides < 10) {
      config.foodSides =
        args && !isNaN(args[0]) && +args[0] >= 3 ? +args[0] : 10;
      this.addSystemLine("Food is now rounded!");
    } else {
      config.foodSides = 5;
      this.addSystemLine("Food is no longer rounded!");
    }
  }
}

module.exports = ChatClient;
