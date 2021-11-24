set NODE_OPTIONS="--openssl-legacy-provider"
npm run build
cls
node "./bin/server/server.js"