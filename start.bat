echo off
cls
set NODE_OPTIONS="--openssl-legacy-provider"
node "./bin/server/server.js"
pause
