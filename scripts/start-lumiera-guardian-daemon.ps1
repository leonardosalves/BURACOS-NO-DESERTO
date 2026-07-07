# Loop em background: checa Lumiera a cada 60s (sem precisar de admin).
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Guardian = Join-Path $PSScriptRoot "lumiera-guardian.ps1"
$PidFile = Join-Path $RepoRoot ".lumiera-logs\guardian-daemon.pid"

if (Test-Path -LiteralPath $PidFile) {
    try {
        $old = [int](Get-Content -LiteralPath $PidFile -TotalCount 1)
        if ($old -gt 0 -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) {
            exit 0
        }
    } catch { }
}

Set-Content -Path $PidFile -Value $PID -Encoding UTF8

while ($true) {
    & $Guardian -Quiet
    Start-Sleep -Seconds 60
}