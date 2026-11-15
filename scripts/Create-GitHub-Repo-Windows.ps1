# Run from the extracted project folder after authenticating GitHub CLI (`gh auth login`).
# Creates a BRAND-NEW repository under ANN-KOREA. Defaults to PRIVATE source code;
# the deployed Netlify website can still be public.
param(
  [string]$Owner = "ANN-KOREA",
  [string]$RepoName = "GARD-P2P-Asset-Market",
  [switch]$Public
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required: https://git-scm.com/downloads" }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI is required: https://cli.github.com/ (then gh auth login)" }
& gh auth status
if ($LASTEXITCODE -ne 0) { throw "Please run: gh auth login" }
if (-not (Test-Path ".git")) { & git init }
if ($LASTEXITCODE -ne 0) { throw "git init failed" }
& git branch -M main
& git add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed" }
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  & git commit -m "Initial GARD P2P market v1.0"
  if ($LASTEXITCODE -ne 0) { throw "git commit failed; check git user.name and user.email" }
}
$fullName = "$Owner/$RepoName"
$visibility = if ($Public.IsPresent) { "--public" } else { "--private" }
Write-Host "Creating NEW GitHub repository: $fullName ($visibility)" -ForegroundColor Cyan
& gh repo create $fullName $visibility --source . --remote origin --push
if ($LASTEXITCODE -ne 0) { throw "Repository creation/push failed. Do not assume GitHub or Netlify is deployed." }
Write-Host "New repository pushed: https://github.com/$fullName" -ForegroundColor Green
Write-Host "Next: Netlify > Add new project > Import an existing project > GitHub" -ForegroundColor Yellow
