clear
export NODE_OPTIONS=--openssl-legacy-provider
gulp build
# clear
node ./bin/server/server.js
read -p "Press any key to continue... " -n1 -s