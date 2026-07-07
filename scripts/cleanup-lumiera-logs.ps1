# Limpa logs temporarios do Lumiera sem apagar arquivos de estado pequenos.
param(
    [int]$RetentionDays = 3,
    [int]$JobRetentionHours = 24,
    [int64]$MaxLogBytes = 5242880
)

$ErrorActionPreference = "SilentlyContinue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $RepoRoot ".lumiera-logs"

if (-not (Test-Path -LiteralPath $LogDir)) {
    return
}

$now = Get-Date
$logCutoff = $now.AddDays(-[Math]::Max(1, $RetentionDays))
$jobCutoff = $now.AddHours(-[Math]::Max(1, $JobRetentionHours))
$logExtensions = @(".log", ".txt")

foreach ($file in Get-ChildItem -LiteralPath $LogDir -File -ErrorAction SilentlyContinue) {
    try {
        if ($logExtensions -notcontains $file.Extension.ToLowerInvariant()) {
            continue
        }
        if ($file.LastWriteTime -lt $logCutoff) {
            Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
            continue
        }
        if ($file.Length -gt $MaxLogBytes) {
            $line = "[{0}] [log-rotated] arquivo excedeu {1} bytes e foi reiniciado." -f (Get-Date).ToUniversalTime().ToString("o"), $MaxLogBytes
            [System.IO.File]::WriteAllText($file.FullName, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
        }
    } catch {
        # Arquivo em uso: deixa para a proxima limpeza.
    }
}

foreach ($dirName in @("ai-jobs", "render-jobs")) {
    $dir = Join-Path $LogDir $dirName
    if (-not (Test-Path -LiteralPath $dir)) {
        continue
    }
    foreach ($file in Get-ChildItem -LiteralPath $dir -File -Filter "*.json" -ErrorAction SilentlyContinue) {
        try {
            if ($file.LastWriteTime -lt $jobCutoff) {
                Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Ignora jobs em uso.
        }
    }
}
