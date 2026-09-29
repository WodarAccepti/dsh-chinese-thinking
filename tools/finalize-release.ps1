# Finalize the verified release artifacts: copy them from the stage directory
# into <repo>/release, drop the superseded PowerShell packer, and recompute
# SHA256SUMS from the copied files.
#
# Usage: powershell -NoProfile -File tools/finalize-release.ps1 -Stage <StageDir>
param(
  [Parameter(Mandatory = $true)][string]$Stage
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Stage)) { throw "stage directory not found: $Stage" }
$repo = Split-Path -Parent $PSScriptRoot
if (-not $repo) { throw "cannot resolve repo root from $PSScriptRoot" }
$release = Join-Path $repo 'release'
Write-Output "repo    = $repo"
Write-Output "release = $release"
Write-Output "stage   = $Stage"

New-Item -ItemType Directory -Path $release -Force | Out-Null

# 1) Remove the superseded PowerShell packer (replaced by tools/pack-release.mjs).
$broken = Join-Path $PSScriptRoot 'pack-release.ps1'
if (Test-Path -LiteralPath $broken) {
  Remove-Item -LiteralPath $broken -Force
  Write-Output "removed $broken"
}

# 2) Copy the verified artifacts.
$names = @('dsh-chinese-thinking-1.0.0.tgz', 'dsh-chinese-thinking-1.0.0-source.zip')
foreach ($n in $names) {
  Copy-Item -LiteralPath (Join-Path $Stage $n) -Destination (Join-Path $release $n) -Force
}

# 3) Recompute checksums from the copied files.
$lines = foreach ($n in $names) {
  $h = (Get-FileHash -LiteralPath (Join-Path $release $n) -Algorithm SHA256).Hash.ToLower()
  "$h  $n"
}
($lines -join "`n") | Set-Content -LiteralPath (Join-Path $release 'SHA256SUMS') -Encoding ascii -NoNewline

Write-Output '--- release dir ---'
Get-ChildItem -LiteralPath $release | Select-Object Length, Name | Format-Table -AutoSize
Write-Output '--- SHA256SUMS ---'
Get-Content -LiteralPath (Join-Path $release 'SHA256SUMS')
