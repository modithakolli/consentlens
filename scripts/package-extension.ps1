param(
  [string]$OutputPath = "$(Join-Path $PSScriptRoot '..\release\consentlens-extension.zip')"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$extensionRoot = Join-Path $repoRoot 'extension'

if (-not (Test-Path $extensionRoot)) {
  throw "Extension folder not found: $extensionRoot"
}

$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

if (Test-Path $OutputPath) {
  Remove-Item $OutputPath -Force
}

Compress-Archive -Path (Join-Path $extensionRoot '*') -DestinationPath $OutputPath
Write-Host "Created extension package at $OutputPath"
