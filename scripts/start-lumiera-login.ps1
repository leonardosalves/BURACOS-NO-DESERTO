# Boot no login — delega ao ensure (uniport ou dev).
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

& (Join-Path $PSScriptRoot "ensure-lumiera.ps1") -Quiet | Out-Null
if ($LASTEXITCODE -eq 0) {
    Start-Process (Get-LumieraDashboardUrl) | Out-Null
}