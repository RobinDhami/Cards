$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    python -m venv (Join-Path $projectRoot ".venv")
}

& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $projectRoot "requirements.txt")

if (-not (Test-Path (Join-Path $projectRoot ".env"))) {
    Copy-Item (Join-Path $projectRoot ".env.example") (Join-Path $projectRoot ".env")
    Write-Host "Created .env from .env.example"
}

Push-Location (Join-Path $projectRoot "frontend")
try {
    pnpm install --frozen-lockfile
    pnpm build
}
finally {
    Pop-Location
}

& $venvPython (Join-Path $projectRoot "manage.py") migrate
& $venvPython (Join-Path $projectRoot "manage.py") check

Write-Host "Setup complete. Run .\run-dev.ps1 to start Django."
