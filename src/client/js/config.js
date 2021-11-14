module.exports = {
  // Keys and other mathematical constants
  KEY_ESC: "Escape",
  KEY_ENTER: "Enter",
  KEY_CHAT: "Tab",
  KEY_FIREFOOD: "w",
  KEY_SPLIT: " ",
  KEY_LEFT: "ArrowLeft",
  KEY_UP: "ArrowUp",
  KEY_RIGHT: "ArrowRight",
  KEY_DOWN: "ArrowDown",
  borderDraw: false,
  spin: -Math.PI,
  enemySpin: -Math.PI,
  mobile: false,
  foodSides: 10,
  virusSides: 20,

  // Canvas
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  gameWidth: 0,
  gameHeight: 0,
  xoffset: -0,
  yoffset: -0,
  gameStart: false,
  disconnected: false,
  died: false,
  kicked: false,
  continuity: false,
  startPingTime: 0,
  toggleMassState: 0,
  // backgroundColor: "#f2fbff",
  backgroundColor: "#a9a9a9",
  lineColor: "#a9a9a9",
};
