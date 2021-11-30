const config = require("./config.js");

class ChatClient {
  constructor() {
    this.canvas = config.canvas;
    this.socket = config.socket;
    this.mobile = config.mobile;
    this.player = config.player;
    this.commands = {};
    const chatInput = document.getElementById("chatInput");
    chatInput.addEventListener("keypress", this.sendChat.bind(this));
    chatInput.addEventListener("keyup", (key) => {
      key = key.code;
      if (key === config.KEY_ESC) {
        chatInput.value = "";
        // this.canvas.focus();
        document.getElementById("canvas").focus();
      }
    });
    config.chatClient = this;
  }

  // TODO: Break out many of these GameControls into separate classes.
  registerFunctions() {
    this.registerCommand("ping", "Check your latency.", () => {
      this.checkLatency();
    });

    this.registerCommand("dark", "Toggle dark mode.", () => {
      this.toggleDarkMode();
    });

    this.registerCommand("border", "Toggle visibility of border.", () => {
      this.toggleBorder();
    });

    this.registerCommand("mass", "Toggle visibility of mass.", () => {
      this.toggleMass();
    });

    this.registerCommand("continuity", "Toggle continuity.", () => {
      this.toggleContinuity();
    });

    this.registerCommand("roundfood", "Toggle food drawing.", (args) => {
      this.toggleRoundFood(args);
    });

    this.registerCommand("help", "Information about the chat commands.", () => {
      this.printHelp();
    });

    this.registerCommand("login", "Login as an admin.", (args) => {
      this.socket.emit("pass", args);
    });

    this.registerCommand("kick", "Kick a player, for admins only.", (args) => {
      this.socket.emit("kick", args);
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
    const chatInput = document.getElementById("chatInput");

    key = key.code;

    if (key === config.KEY_ENTER) {
      var text = chatInput.value.replace(/(<([^>]+)>)/gi, "");
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
        chatInput.value = "";
        document.getElementById("canvas").focus();
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
    const LIGHT = config.lightBackgroundColor;
    const DARK = config.darkBackgroundColor;
    const LINELIGHT = config.lightLineColor;
    const LINEDARK = config.darkLineColor;

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
