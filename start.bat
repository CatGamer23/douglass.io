@echo off
cls
set NODE_OPTIONS="--openssl-legacy-provider"
cmd /C gulp build
node "%cd%\bin\server\server.js"
pause