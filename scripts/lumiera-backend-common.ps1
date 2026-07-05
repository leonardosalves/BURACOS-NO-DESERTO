# Funções compartilhadas — iniciar/verificar backend Lumiera (porta 3005)
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:BackendDir = Join-Path (Join-Path $script:RepoRoot "dashboard-qanat") "backend"
$script:LogDir = Join-Path $script:RepoRoot ".lumiera-logs"
$script:NotebookLmData = Join-Path $script:RepoRoot ".notebooklm-data"
$script:BackendPort = 3005
$script:HealthUrl = "http://127.0.0.1:$($script:BackendPort)/api/health"

function Ensure-LumieraLogDir {
    if (-not (Test-Path $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }
}

function Write-LumieraLog {
    param([string]$Message, [string]$Level = "INFO")
    Ensure-LumieraLogDir
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -Path (Join-Path $script:LogDir "backend-watch.log") -Value $line -Encoding UTF8
}

function Test-LumieraBackendHealthy {
    try {
        $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Resolve-NlmBin {
    if ($env:NLM_BIN -and (Test-Path -LiteralPath $env:NLM_BIN)) {
        return $env:NLM_BIN
    }
    $localNlm = Join-Path $env:LOCALAPPDATA ".local\bin\nlm.exe"
    if (Test-Path -LiteralPath $localNlm) {
        return $localNlm
    }
    $cmd = Get-Command nlm -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
    return $null
}

function Stop-LumieraBackendOnPort {
    $connections = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -ne 0) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    if ($connections) { Start-Sleep -Seconds 1 }
}

function Start-LumieraBackendProcess {
    param([switch]$ForceRestart)

    Ensure-LumieraLogDir
    if (-not (Test-Path $script:NotebookLmData)) {
        New-Item -ItemType Directory -Path $script:NotebookLmData -Force | Out-Null
    }
    $env:NOTEBOOKLM_MCP_CLI_PATH = $script:NotebookLmData
    $nlmBin = Resolve-NlmBin
    if ($nlmBin) {
        $env:NLM_BIN = $nlmBin
        $localBin = Split-Path -Parent $nlmBin
        if ($localBin -and ($env:Path -notlike "*$localBin*")) {
            $env:Path = "$localBin;$env:Path"
        }
    }

    if (Test-LumieraBackendHealthy) {
        if (-not $ForceRestart) {
            Write-LumieraLog "Backend já responde em $script:HealthUrl"
            return $true
        }
        Write-LumieraLog "Reiniciando backend (ForceRestart)" "WARN"
        Stop-LumieraBackendOnPort
    } else {
        Stop-LumieraBackendOnPort
    }

    $stdout = Join-Path $script:LogDir "backend-stdout.log"
    $stderr = Join-Path $script:LogDir "backend-stderr.log"

    Write-LumieraLog "Iniciando node server.js em $script:BackendDir"
    Start-Process `
        -FilePath "node" `
        -ArgumentList "server.js" `
        -WorkingDirectory $script:BackendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr | Out-Null

    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if (Test-LumieraBackendHealthy) {
            Write-LumieraLog "Backend OK - $script:HealthUrl"
            return $true
        }
    }

    Write-LumieraLog "Backend nao respondeu em 30s - veja backend-stderr.log" "ERROR"
    return $false
}