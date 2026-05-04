$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker was not found. Installing Docker Desktop with winget..."
  winget install --id Docker.DockerDesktop -e
  Write-Host "Restart this terminal after Docker Desktop starts, then rerun this script."
  exit 0
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (-not (Test-Path ".env")) {
  "OPEN_COOKBOOK_PORT=8080" | Out-File -Encoding ascii ".env"
}

docker compose --env-file .env -f server/local/docker-compose.yml up -d
Write-Host "Open Cookbook is running at http://localhost:8080"
