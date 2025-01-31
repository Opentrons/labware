param (
    [Parameter(Mandatory = $true)][string]$TestKey,
    [Parameter(Mandatory = $true)][string]$ProtocolFilePath,
    [Parameter(Mandatory = $true)][int]$ExpectedReturnCode,
    [string]$Venv = "venv",
    [string]$ResultDir = "results"
)

# Ensure result directory exists
if (-Not (Test-Path -Path $ResultDir)) {
    Write-Output "Creating result directory at $ResultDir..."
    New-Item -ItemType Directory -Path $ResultDir | Out-Null
}

# Construct result file path
$ResultFile = Join-Path -Path $ResultDir -ChildPath "$TestKey.txt"

Write-Output "Activating virtual environment $Venv..."
if (Test-Path -Path "$Venv/Scripts/Activate.ps1") {
    . "$Venv/Scripts/Activate.ps1"
} else {
    Write-Error "Virtual environment not found at $Venv."
    exit 1
}

Write-Output "Running opentrons_simulate for protocol:"
Write-Output $ProtocolFilePath

# Run opentrons_simulate and capture output
$Output = & opentrons_simulate $ProtocolFilePath 2>&1
$ReturnCode = $LASTEXITCODE

# Validate return code
if ($ReturnCode -ne $ExpectedReturnCode) {
    Write-Output "FAIL: Return code is $ReturnCode, expected $ExpectedReturnCode" | Tee-Object -FilePath $ResultFile
    Add-Content -Path $ResultFile -Value "Output was:"
    Add-Content -Path $ResultFile -Value $Output
    Rename-Item -Path $ResultFile -NewName "$($ResultFile -replace '\.txt$', '_FAIL.txt')"
    exit 1
} else {
    Write-Output "PASS: Return code is $ReturnCode, expected $ExpectedReturnCode" | Tee-Object -FilePath $ResultFile
    Add-Content -Path $ResultFile -Value "Output was:"
    Add-Content -Path $ResultFile -Value $Output
    exit 0
}
