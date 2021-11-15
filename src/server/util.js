const cfg = require("./../../config.json");

exports.validNick = (nickname) => {
  var regex = /^\w*$/;
  return regex.exec(nickname) !== null;
};

// determine mass from radius of circle
exports.massToRadius = (mass) => 4 + Math.sqrt(mass) * 6;

// overwrite Math.log function
exports.log = (() => {
  var log = Math.log;
  return (n, base) => log(n) / (base ? log(base) : 1);
})();

// get the Euclidean distance between the edges of two shapes
exports.getDistance = (point1, point2) =>
  Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  ) -
  point1.radius -
  point2.radius;

exports.randomInRange = (from, to) =>
  Math.floor(Math.random() * (to - from)) + from;

// generate a random position within the field of play
exports.randomPosition = (radius) => ({
  x: exports.randomInRange(radius, cfg.gameWidth - radius),
  y: exports.randomInRange(radius, cfg.gameHeight - radius),
});

exports.uniformPosition = (points, radius) => {
  var bestCandidate,
    maxDistance = 0;
  var numberOfCandidates = 10;

  if (points.length === 0) {
    return exports.randomPosition(radius);
  }

  // Generate the candidates
  for (var ci = 0; ci < numberOfCandidates; ci++) {
    var minDistance = Infinity;
    var candidate = exports.randomPosition(radius);
    candidate.radius = radius;

    for (var pi = 0; pi < points.length; pi++) {
      var distance = exports.getDistance(candidate, points[pi]);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    if (minDistance > maxDistance) {
      bestCandidate = candidate;
      maxDistance = minDistance;
    } else {
      return exports.randomPosition(radius);
    }
  }

  return bestCandidate;
};

exports.findIndex = (arr, id) => {
  var len = arr.length;

  while (len--) {
    if (arr[len].id === id) {
      return len;
    }
  }

  return -1;
};

exports.randomColor = () => {
  var color =
    "#" + ("00000" + ((Math.random() * (1 << 24)) | 0).toString(16)).slice(-6);
  var c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  var r = parseInt(c[1], 16) - 32 > 0 ? parseInt(c[1], 16) - 32 : 0;
  var g = parseInt(c[2], 16) - 32 > 0 ? parseInt(c[2], 16) - 32 : 0;
  var b = parseInt(c[3], 16) - 32 > 0 ? parseInt(c[3], 16) - 32 : 0;

  return {
    fill: color,
    border: "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1),
  };
};
