set NODE_OPTIONS="--openssl-legacy-provider"
gulp build
cls
node "./bin/server/server.js"