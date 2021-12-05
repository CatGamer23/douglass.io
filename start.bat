echo off
cls
set NODE_OPTIONS="--openssl-legacy-provider"
gulp build
node "./bin/server/server.js"
pause