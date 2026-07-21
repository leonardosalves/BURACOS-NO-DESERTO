# ensure-omniroute.ps1 — Inicia OmniRoute Local se instalado e não está rodando.
# Chamado pelo ensure-lumiera.ps1 e restart-backend.ps1 para auto-start.
# Suporta execução sob o contexto LocalSystem (Serviço do Windows) resolvendo o .cmd do npm global.
param(
    [switch]$Quiet,
    [int]$Port = 20128,
    [int]$TimeoutSec = 10
)

$ErrorActionPreference = "SilentlyContinue"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:LogDir = Join-Path $script:RepoRoot ".lumiera-logs"
$script:OmniRoutePidFile = Join-Path $script:LogDir "omniroute.pid"
$script:OmniRouteLog = Join-Path $script:LogDir "omniroute.log"

function Get-OmniRouteExecutable {
    # 1) Tentar direto via PATH
    $cmd = Get-Command "omniroute" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # 2) Varrer perfis de usuários conhecidos (importante para LocalSystem)
    $usersDir = "C:\Users"
    if (Test-Path -LiteralPath $usersDir) {
        $profiles = Get-ChildItem -Path $usersDir -Directory -ErrorAction SilentlyContinue
        foreach ($p in $profiles) {
            $npmPath = Join-Path $p.FullName "AppData\Roaming\npm\omniroute.cmd"
            if (Test-Path -LiteralPath $npmPath) {
                return $npmPath
            }
            $npmPs1 = Join-Path $p.FullName "AppData\Roaming\npm\omniroute.ps1"
            if (Test-Path -LiteralPath $npmPs1) {
                return $npmPs1
            }
        }
    }

    # 3) Outros caminhos comuns
    $commonPaths = @(
        "C:\Program Files\nodejs\omniroute.cmd",
        "C:\Program Files (x86)\nodejs\omniroute.cmd",
        "$env:APPDATA\npm\omniroute.cmd"
    )
    foreach ($cp in $commonPaths) {
        if (Test-Path -LiteralPath $cp) {
            return $cp
        }
    }

    return $null
}

function Test-OmniRouteRunning {
    try {
        $line = & netstat -ano 2>$null |
            Select-String -Pattern ":$Port\s+.*LISTENING" |
            Select-Object -First 1
        return [bool]$line
    } catch { return $false }
}

function Test-OmniRouteHealthy {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/v1" -TimeoutSec 3 -UseBasicParsing
        return $resp.StatusCode -eq 200
    } catch { return $false }
}

function Start-OmniRouteProcess {
    param([string]$ExecutablePath)

    if (-not (Test-Path -LiteralPath $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }

    $workingDir = Split-Path -Parent $ExecutablePath

    if (-not $Quiet) {
        Write-Host "[OmniRoute] Iniciando gateway local na porta $Port usando: $ExecutablePath" -ForegroundColor Cyan
        Write-Host "[OmniRoute] Diretorio de trabalho: $workingDir" -ForegroundColor DarkGray
    }

    # Limpar logs anteriores
    Clear-Content -Path $script:OmniRouteLog -ErrorAction SilentlyContinue
    Clear-Content -Path (Join-Path $script:LogDir "omniroute-stderr.log") -ErrorAction SilentlyContinue

    # Iniciar processo de forma oculta
    # Importante: para que continue executando órfão sob o Windows,
    # iniciamos com o WorkingDirectory configurado corretamente.
    $proc = Start-Process -FilePath $ExecutablePath `
        -WorkingDirectory $workingDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $script:OmniRouteLog `
        -RedirectStandardError (Join-Path $script:LogDir "omniroute-stderr.log") `
        -PassThru

    if ($proc) {
        $proc.Id | Out-File -FilePath $script:OmniRoutePidFile -Force -Encoding ASCII
        if (-not $Quiet) {
            Write-Host "[OmniRoute] Processo iniciado PID=$($proc.Id)" -ForegroundColor DarkGray
        }
    }

    # Aguardar até responder
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-OmniRouteHealthy) {
            if (-not $Quiet) {
                Write-Host "[OmniRoute] Online em http://127.0.0.1:$Port" -ForegroundColor Green
            }
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    # Checar se o processo ainda existe ou porta está ouvindo
    if (Test-OmniRouteRunning) {
        if (-not $Quiet) {
            Write-Host "[OmniRoute] Porta escutando mas /v1 sem resposta (inicializando)" -ForegroundColor Yellow
        }
        return $true
    }

    if (-not $Quiet) {
        Write-Host "[OmniRoute] Falha ao iniciar - veja $script:OmniRouteLog" -ForegroundColor Yellow
    }
    return $false
}

# === MAIN ===
$exe = Get-OmniRouteExecutable
if (-not $exe) {
    if (-not $Quiet) {
        Write-Host "[OmniRoute] Node ou OmniRoute nao instalados. Ignorando." -ForegroundColor DarkGray
    }
    exit 0
}

if (Test-OmniRouteRunning) {
    if (-not $Quiet) {
        Write-Host "[OmniRoute] Ja esta online na porta $Port" -ForegroundColor Green
    }
    exit 0
}

$ok = Start-OmniRouteProcess -ExecutablePath $exe
if ($ok) { exit 0 } else { exit 1 }
