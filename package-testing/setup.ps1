# Exit immediately on any errors
$ErrorActionPreference = "Stop"

$VENV_DIR = $null -ne $env:VENV_DIR ? $env:VENV_DIR : "venv"


if (Test-Path -Path $VENV_DIR) {
    Write-Output "Removing existing virtual environment..."
    Remove-Item -Recurse -Force -Path $VENV_DIR
}

Write-Output "Creating virtual environment in $VENV_DIR..."
python -m venv $VENV_DIR

Write-Output "Activating virtual environment..."
if ($IsWindows) {
    . "$VENV_DIR\Scripts\Activate.ps1"
} else {
    . "$VENV_DIR/bin/activate"
}

Write-Output "Installing packages..."
pip install -U ../shared-data/python ../api

Write-Output "Validating that opentrons-hardware is not installed..."
$pipList = pip list 2>&1
if ($pipList -match "opentrons-hardware") {
    Write-Output "FAIL: opentrons-hardware is installed"
    exit 1
} else {
    Write-Output "PASS: opentrons-hardware is not installed"
}

Write-Output "Packages installed successfully."
pip list

Write-Output "To activate the virtual environment, run:"
if ($IsWindows) {
    Write-Output ".\$VENV_DIR\Scripts\Activate.ps1"
} else {
    Write-Output "source $VENV_DIR/bin/activate"
}
