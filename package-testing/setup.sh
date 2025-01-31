#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

VENV_DIR=${VENV_DIR:-"venv"}

if [ -d "$VENV_DIR" ]; then
    echo "Removing existing virtual environment..."
    rm -rf "$VENV_DIR"
fi

echo "Creating virtual environment in $VENV_DIR..."
python -m venv "$VENV_DIR"

echo "Activating virtual environment..."
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "Installing packages..."
pip install -U ../shared-data/python ../api # add ../hardware here to validate the below check

echo "Validate opentrons-hardware is not installed..."
if pip list 2>/dev/null | grep -q "opentrons-hardware"; then
    echo "FAIL: opentrons-hardware is installed"
    exit 1
else
    echo "PASS: opentrons-hardware is not installed"
fi

echo "Packages installed successfully."
pip list

echo "To activate the virtual environment, run:"
echo "source $VENV_DIR/bin/activate"
