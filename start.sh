export NODE_OPTIONS=--openssl-legacy-provider
npm run build
clear
node ./bin/server/server.js