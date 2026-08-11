$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    throw "Development environment is missing. Run .\setup.ps1 first."
}

& $venvPython (Join-Path $projectRoot "manage.py") runserver
