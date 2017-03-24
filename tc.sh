#!/usr/bin/env bash
set -e

# Enable nvm
mkdir -p ~/.nvm && export NVM_DIR=~/.nvm && source $(brew --prefix nvm)/nvm.sh && nvm alias default 6.0.0
npm config set python /usr/bin/python

# Create python3 env
virtualenv -p python3 venv && source venv/bin/activate

# Build app src
make app
# ./scripts/with-nodenv-linux "make app"

# Build app exe
make api-osx

# Build app shell
make app-shell
# ./scripts/with-nodenv-linux "make app-shell"
