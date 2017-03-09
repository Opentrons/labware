#!/usr/bin/env bash
echo "got here.."

export DISPLAY=':99.0'

echo "got here..2"
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1

# Setup npm version
# nvm use 6.0.0
# nvm alias default 6.0.0
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm alias default 6.0.0

echo "Exec'ing the cmd: '$1'"
eval $1
