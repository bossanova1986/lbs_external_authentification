#!/bin/sh
set -e

# process ENV
# CONFIG_DIR
export CONFIG_DIR=/config

cd /usr/src/app/

su -s /bin/sh -c "node /usr/src/app/dist/main.js" nodeuser 

exit 1