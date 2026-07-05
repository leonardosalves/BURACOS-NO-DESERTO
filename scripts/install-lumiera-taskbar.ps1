# Cria atalho Lumiera com icone e fixa na barra de tarefas do Windows.
# Execute uma vez: .\scripts\install-lumiera-taskbar.ps1
param(
    [switch]$DesktopOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$StartScript = Join-Path $PSScriptRoot "start-lumiera.ps1"
$IconPath = Join-Path $RepoRoot "dashboard-qanat\frontend\public\lumiera.ico"

if (-not (Test-Path $StartScript)) {
    Write-Host "Nao encontrado: $StartScript" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $IconPath)) {
    Write-Host "Icone ausente: $IconPath" -ForegroundColor Red
    exit 1
}

$ShortcutName = "Lumiera Studio.lnk"
$Wsh = New-Object -ComObject WScript.Shell

function New-LumieraShortcut([string]$Path) {
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (Test-Path $Path) { Remove-Item $Path -Force }

    $lnk = $Wsh.CreateShortcut($Path)
    $lnk.TargetPath = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
    $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$StartScript`""
    $lnk.WorkingDirectory = $RepoRoot
    $lnk.IconLocation = "$IconPath,0"
    $lnk.Description = "Lumiera Studio - painel de producao de video"
    $lnk.Save()
}

$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$taskbarPin = Join-Path $env:APPDATA "Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"

New-LumieraShortcut (Join-Path $desktop $ShortcutName)
New-LumieraShortcut (Join-Path $startMenu $ShortcutName)
Write-Host "Atalho criado na Area de Trabalho e Menu Iniciar." -ForegroundColor Green

if (-not $DesktopOnly) {
    New-LumieraShortcut (Join-Path $taskbarPin $ShortcutName)
    Write-Host "Atalho copiado para a barra de tarefas (User Pinned TaskBar)." -ForegroundColor Green
}

Write-Host ""
Write-Host "Se o icone nao aparecer na barra:" -ForegroundColor Cyan
Write-Host "  1. Abra o atalho 'Lumiera Studio' na Area de Trabalho" -ForegroundColor White
Write-Host "  2. Clique direito no icone na barra > Fixar na barra de tarefas" -ForegroundColor White
Write-Host ""
Write-Host "Iniciar agora:" -ForegroundColor Cyan
Write-Host "  .\scripts\start-lumiera.ps1" -ForegroundColor White