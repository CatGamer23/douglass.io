clear
export NODE_OPTIONS=--openssl-legacy-provider
gulp build
# clear
node ./bin/server/server.js