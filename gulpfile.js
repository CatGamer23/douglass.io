const gulp = require("gulp");
const babel = require("gulp-babel");
const jshint = require("gulp-jshint");
const nodemon = require("gulp-nodemon");
const uglify = require("gulp-uglify");
const util = require("gulp-util");
const mocha = require("gulp-mocha");
const todo = require("gulp-todo");
const webpack = require("webpack-stream");

gulp.task("lint", async () => {
  return gulp
    .src(["**/*.js", "!node_modules/**/*.js", "!bin/**/*.js"])
    .pipe(
      jshint({
        // esnext: true,
        esversion: 8,
      })
    )
    .pipe(jshint.reporter("default", { verbose: true }))
    .pipe(jshint.reporter("fail"));
});

gulp.task("move-client", async () => {
  return gulp
    .src(["src/client/**/*.*", "!client/js/*.js"])
    .pipe(gulp.dest("./bin/client/"));
});

gulp.task("move-config", async () => {
  return gulp.src(["./config.json"]).pipe(gulp.dest("./bin/"));
});

gulp.task("move-images", async () => {
  return gulp
    .src(["./src/server/skins/**/*.*"])
    .pipe(gulp.dest("./bin/server/skins/"));
});

gulp.task(
  "test",
  gulp.series("lint", async () => {
    gulp.src(["./test/**/*.js"]).pipe(mocha());
  })
);

gulp.task(
  "build-client",
  gulp.series("lint", "move-client", async () => {
    return gulp
      .src(["src/client/js/main.js"])
      .pipe(uglify())
      .pipe(webpack(require("./webpack.config.js")))
      .pipe(
        babel({
          presets: [["env", { modules: false }]],
        })
      )
      .pipe(gulp.dest("bin/client/js/"));
  })
);

gulp.task(
  "build-server",
  gulp.series("lint", "move-config", "move-images", async () => {
    return gulp
      .src(["src/server/**/*.*", "src/server/**/*.js"])
      .pipe(babel())
      .pipe(gulp.dest("bin/server/"));
  })
);

gulp.task("build", gulp.series("build-client", "build-server")); //, "test"));

gulp.task("watch", async () => {
  gulp.watch(
    ["src/**/*.*"],
    gulp.series("build", "run-only", async () => {
      util.log(util.colors.magenta("Server restarted!"));
    })
  );
});

gulp.task(
  "todo",
  gulp.series("lint", async () => {
    gulp.src("src/**/*.js").pipe(todo()).pipe(gulp.dest("./"));
  })
);

gulp.task(
  "run",
  gulp.series("build", async () => {
    nodemon({
      script: "./bin/server/server.js",
      args: ["--quiet"],
      ext: "html js css",
    }).on("restart", (files) => {
      util.log("App restarted due to: ", files);
    });
  })
);

gulp.task("run-only", async () => {
  nodemon({
    script: "./server/server.js",
    args: ["--quiet"],
    ext: "html js css",
  }).on("restart", (files) => {
    util.log("App restarted due to: ", files);
  });
});

gulp.task("default", gulp.series("run"));
