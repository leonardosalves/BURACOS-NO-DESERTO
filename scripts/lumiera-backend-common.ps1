# Shared helpers to start/check the Lumiera backend on port 3005.
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:BackendDir = Join-Path (Join-Path $script:RepoRoot "dashboard-qanat") "backend"
$script:LogDir = Join-Path $script:RepoRoot ".lumiera-logs"
$script:NotebookLmData = Join-Path $script:RepoRoot ".notebooklm-data"
$script:BackendPort = 3005
$script:HealthUrl = "http://127.0.0.1:$($script:BackendPort)/api/health"
$script:PidFile = Join-Path $script:LogDir "backend.pid"
$script:RestartLockFile = Join-Path $script:LogDir "backend-restart.lock"
$script:LastRestartFile = Join-Path $script:LogDir "backend-last-restart.txt"
$script:NodeMaxOldSpaceMb = 4096
$script:Pm2ModeFile = Join-Path $script:LogDir "pm2.mode"
$script:SyntaxCheckLog = Join-Path $script:LogDir "backend-syntax-check.log"
$script:LogCleanupScript = Join-Path $script:RepoRoot "scripts\cleanup-lumiera-logs.ps1"
$script:LastLogCleanup = $null

function Invoke-LumieraLogCleanup {
    if ($script:LastLogCleanup -and ((Get-Date) - $script:LastLogCleanup).TotalMinutes -lt 30) {
        return
    }
    $script:LastLogCleanup = Get-Date
    if (Test-Path -LiteralPath $script:LogCleanupScript) {
        & $script:LogCleanupScript -RetentionDays 3 -JobRetentionHours 24 -MaxLogBytes 5242880 | Out-Null
    }
}

function Ensure-LumieraLogDir {
    if (-not (Test-Path -LiteralPath $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }
    Invoke-LumieraLogCleanup
}

function Write-LumieraLog {
    param([string]$Message, [string]$Level = "INFO")
    Ensure-LumieraLogDir
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -Path (Join-Path $script:LogDir "backend-watch.log") -Value $line -Encoding UTF8
}

function Get-PortListenerPidFast([int]$Port) {
    try {
        $line = & netstat -ano 2>$null |
            Select-String -Pattern ":$Port\s+.*LISTENING" |
            Select-Object -First 1
        if ($line -and ($line.ToString() -match "\s(\d+)\s*$")) {
            return [int]$Matches[1]
        }
    } catch { }
    return $null
}

function Get-BackendListenerPid {
    $fast = Get-PortListenerPidFast $script:BackendPort
    if ($fast) { return $fast }

    try {
        $conn = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess -and $conn.OwningProcess -ne 0) {
            return [int]$conn.OwningProcess
        }
    } catch { }
    return $null
}

function Test-LumieraBackendHealthy {
    param(
        [int]$Retries = 3,
        [int]$TimeoutSec = 8,
        [switch]$Quick
    )

    $retries = if ($Quick) { 1 } else { $Retries }
    $timeout = if ($Quick) { [Math]::Min($TimeoutSec, 4) } else { $TimeoutSec }

    for ($i = 1; $i -le $retries; $i++) {
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curl) {
            try {
                $body = & curl.exe -sS --max-time $timeout $script:HealthUrl 2>$null
                if ($LASTEXITCODE -eq 0 -and $body -match '"ok"\s*:\s*true') {
                    return $true
                }
            } catch { }
        }
        try {
            $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec $timeout -Headers @{ "Connection" = "close" }
            if ($r.StatusCode -eq 200 -and $r.Content -match '"ok"\s*:\s*true') {
                return $true
            }
        } catch { }
        if ($i -lt $retries) {
            Start-Sleep -Milliseconds 300
        }
    }
    return $false
}

function Wait-BackendPortFree {
    param([int]$TimeoutSec = 25)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-BackendListenerPid)) {
            return $true
        }
        Start-Sleep -Milliseconds 400
    }
    return (-not (Get-BackendListenerPid))
}

function Test-BackendRestartLock {
    if (-not (Test-Path -LiteralPath $script:RestartLockFile)) { return $false }
    try {
        $stamp = [datetime]::Parse((Get-Content -LiteralPath $script:RestartLockFile -TotalCount 1 -ErrorAction Stop))
        if (((Get-Date) - $stamp).TotalSeconds -lt 90) { return $true }
    } catch { }
    Remove-Item -LiteralPath $script:RestartLockFile -Force -ErrorAction SilentlyContinue
    return $false
}

function Set-BackendRestartLock {
    Ensure-LumieraLogDir
    Set-Content -Path $script:RestartLockFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
}

function Clear-BackendRestartLock {
    Remove-Item -LiteralPath $script:RestartLockFile -Force -ErrorAction SilentlyContinue
}

function Test-ActiveLumieraRender {
    $jobsDir = Join-Path $script:RepoRoot ".lumiera-logs\render-jobs"
    if (-not (Test-Path -LiteralPath $jobsDir)) { return $false }
    $cutoff = (Get-Date).AddHours(-4)
    foreach ($file in Get-ChildItem -LiteralPath $jobsDir -Filter "*.json" -ErrorAction SilentlyContinue) {
        try {
            $job = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop | ConvertFrom-Json
            if ($job.status -notin @("preparing", "rendering")) { continue }
            $updated = [datetime]::MinValue
            if ($job.updatedAt) {
                $updated = [datetimeOffset]::FromUnixTimeMilliseconds([int64]$job.updatedAt).LocalDateTime
            }
            if ($updated -lt $cutoff) { continue }
            if ($job.childPid) {
                $proc = Get-Process -Id ([int]$job.childPid) -ErrorAction SilentlyContinue
                if ($proc) { return $true }
            }
        } catch { }
    }
    return $false
}

function Write-BackendPidFile([int]$ProcessId) {
    Ensure-LumieraLogDir
    Set-Content -Path $script:PidFile -Value $ProcessId -Encoding UTF8
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
    $pids = @()
    $listenerPid = Get-PortListenerPidFast $script:BackendPort
    if ($listenerPid) { $pids += $listenerPid }

    if ($pids.Count -eq 0) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {
                if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
                    $pids += [int]$conn.OwningProcess
                }
            }
        } catch { }
    }

    foreach ($procId in ($pids | Select-Object -Unique)) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    if ($pids.Count -gt 0) {
        Write-LumieraLog ("Processo(s) encerrado(s) na porta {0}: {1}" -f $script:BackendPort, ($pids -join ", "))
    }
    [void](Wait-BackendPortFree -TimeoutSec 20)
    Remove-Item -LiteralPath $script:PidFile -Force -ErrorAction SilentlyContinue
}

function Initialize-LumieraBackendEnv {
    Ensure-LumieraLogDir
    if (-not (Test-Path -LiteralPath $script:NotebookLmData)) {
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
}

function Start-LumieraStackDirect {
    Initialize-LumieraBackendEnv
    Stop-LumieraBackendOnPort
    $fePid = Get-PortListenerPidFast 5176
    if ($fePid) {
        Stop-Process -Id $fePid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    $backendOk = Start-LumieraBackendProcess -Direct -ForceRestart -SkipDebounce
    return $backendOk
}

function Start-LumieraBackendProcess {
    param(
        [switch]$ForceRestart,
        [switch]$SkipDebounce,
        [switch]$SpawnOnly,
        [switch]$Direct
    )

    Initialize-LumieraBackendEnv

    if (
        -not $Direct -and
        (Test-LumieraPm2Mode -or (Test-Path -LiteralPath (Join-Path $script:LogDir "permanent.mode")))
    ) {
        if ($ForceRestart) {
            return Ensure-LumieraPm2Backend -Reload
        }
        return Repair-LumieraPm2Stack
    }

    if (Test-BackendRestartLock) {
        Write-LumieraLog "Reinicio ja em andamento (lock) - aguardando" "WARN"
        $deadline = (Get-Date).AddSeconds(120)
        while ((Get-Date) -lt $deadline) {
            if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 8) {
                $listenerPid = Get-BackendListenerPid
                if ($listenerPid) { Write-BackendPidFile $listenerPid }
                return $true
            }
            Start-Sleep -Milliseconds 800
        }
        Clear-BackendRestartLock
    }

    $livePid = Get-BackendListenerPid
    $healthy = Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 8

    if ($healthy) {
        if ($livePid) { Write-BackendPidFile $livePid }
        if (-not $ForceRestart) {
            Write-LumieraLog "Backend ja responde em $script:HealthUrl"
            return $true
        }
        if (Test-ActiveLumieraRender) {
            Write-LumieraLog "Render ativo - ForceRestart bloqueado (nao interromper video)" "WARN"
            return $true
        }
        Write-LumieraLog "Reiniciando backend (ForceRestart)" "WARN"
    } elseif ($livePid -and -not $ForceRestart) {
        Write-LumieraLog "Backend ocupado (PID $livePid) - health lento, mantendo processo ativo" "WARN"
        Write-BackendPidFile $livePid
        return $true
    } elseif (-not $livePid) {
        Write-LumieraLog "Backend offline - subindo processo" "WARN"
    } else {
        Write-LumieraLog "ForceRestart: encerrando PID $livePid na porta $script:BackendPort" "WARN"
    }

    if ($ForceRestart -and (Test-ActiveLumieraRender)) {
        Write-LumieraLog "Render ativo - ForceRestart bloqueado (nao interromper video)" "WARN"
        if ($livePid) { Write-BackendPidFile $livePid }
        return $true
    }

    if ($ForceRestart -and -not $SkipDebounce -and (Test-Path -LiteralPath $script:LastRestartFile)) {
        try {
            $last = [datetime]::Parse((Get-Content -LiteralPath $script:LastRestartFile -TotalCount 1 -ErrorAction Stop))
            if (((Get-Date) - $last).TotalSeconds -lt 60) {
                Write-LumieraLog "Debounce ForceRestart: reinicio recente (<60s) - aguardando" "WARN"
                $deadline = (Get-Date).AddSeconds(90)
                while ((Get-Date) -lt $deadline) {
                    if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 15) {
                        $listenerPid = Get-BackendListenerPid
                        if ($listenerPid) { Write-BackendPidFile $listenerPid }
                        return $true
                    }
                    Start-Sleep -Seconds 2
                }
            }
        } catch { }
    }

    Set-BackendRestartLock
    try {
        if ($ForceRestart -or -not $livePid) {
            Stop-LumieraBackendOnPort
        }

        if (-not (Wait-BackendPortFree -TimeoutSec 20)) {
            Write-LumieraLog "Porta 3005 ainda ocupada apos stop" "ERROR"
            return $false
        }

        $stdout = Join-Path $script:LogDir "backend-stdout.log"
        $stderr = Join-Path $script:LogDir "backend-stderr.log"
        if ($ForceRestart) {
            Set-Content -Path $stderr -Value "" -Encoding UTF8 -ErrorAction SilentlyContinue
        }
        $cmdLine = 'node --max-old-space-size={0} server.js 1>> "{1}" 2>> "{2}"' -f $script:NodeMaxOldSpaceMb, $stdout, $stderr

        Write-LumieraLog "Iniciando node server.js em $script:BackendDir"
        $proc = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList @("/d", "/s", "/c", $cmdLine) `
            -WorkingDirectory $script:BackendDir `
            -WindowStyle Hidden `
            -PassThru

        if ($proc -and $proc.Id) {
            Write-BackendPidFile $proc.Id
        }

        Set-Content -Path $script:LastRestartFile -Value ((Get-Date).ToString("o")) -Encoding UTF8

        if ($SpawnOnly) {
            Start-Sleep -Seconds 2
            $listenerPid = Get-BackendListenerPid
            if ($listenerPid) {
                Write-BackendPidFile $listenerPid
                Write-LumieraLog "Backend spawn OK (SpawnOnly) - $script:HealthUrl"
                return $true
            }
            Write-LumieraLog "SpawnOnly: processo ainda subindo na porta $script:BackendPort" "WARN"
            return $true
        }

        $deadline = (Get-Date).AddSeconds(90)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 800
            if (Test-LumieraBackendHealthy -Retries 3 -TimeoutSec 20) {
                $listenerPid = Get-BackendListenerPid
                if ($listenerPid) { Write-BackendPidFile $listenerPid }
                Write-LumieraLog "Backend OK - $script:HealthUrl"
                return $true
            }
        }

        if (Get-BackendListenerPid) {
            Write-LumieraLog "Processo na porta 3005 mas health lento - aguardando mais 120s" "WARN"
            $extraDeadline = (Get-Date).AddSeconds(120)
            while ((Get-Date) -lt $extraDeadline) {
                Start-Sleep -Seconds 3
                if (Test-LumieraBackendHealthy -Retries 3 -TimeoutSec 20) {
                    $listenerPid = Get-BackendListenerPid
                    if ($listenerPid) { Write-BackendPidFile $listenerPid }
                    Write-LumieraLog "Backend OK (subida lenta) - $script:HealthUrl"
                    return $true
                }
            }
        }

        Write-LumieraLog "Backend nao respondeu a tempo - veja backend-stderr.log" "ERROR"
        return $false
    } finally {
        Clear-BackendRestartLock
    }
}

function Initialize-LumieraPm2Env {
    $pm2Home = Join-Path $env:USERPROFILE ".pm2"
    $env:PM2_HOME = $pm2Home
    try {
        [Environment]::SetEnvironmentVariable("PM2_HOME", $pm2Home, "User")
    } catch { }
    if (-not (Test-Path -LiteralPath $pm2Home)) {
        New-Item -ItemType Directory -Path $pm2Home -Force | Out-Null
    }
}

function Reset-LumieraPm2Daemon {
    Initialize-LumieraPm2Env
    Invoke-LumieraPm2 @("kill") | Out-Null
    Start-Sleep -Seconds 2
    foreach ($name in @("pm2.pid", "rpc.sock", "pub.sock")) {
        Remove-Item (Join-Path $env:PM2_HOME $name) -Force -ErrorAction SilentlyContinue
    }
    foreach ($port in @(3005, 5176)) {
        $listenerPid = Get-PortListenerPidFast $port
        if ($listenerPid) {
            Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
    foreach ($attempt in 1..3) {
        $ping = (Invoke-LumieraPm2 @("ping") -CaptureOutput | Out-String)
        if ($ping -match "pong") { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Resolve-LumieraPm2Bin {
    $localPm2 = Join-Path $script:RepoRoot "node_modules\.bin\pm2.cmd"
    if (Test-Path -LiteralPath $localPm2) {
        return $localPm2
    }
    return $null
}

function Test-LumieraPm2DaemonAlive {
    Initialize-LumieraPm2Env
    if (-not (Resolve-LumieraPm2Bin)) { return $false }
    $ping = (Invoke-LumieraPm2 @("ping") -CaptureOutput | Out-String)
    return $ping -match "pong"
}

function Convert-LumieraPm2Json {
    param([object]$Raw)
    $text = if ($Raw -is [array]) { ($Raw | ForEach-Object { "$_" }) -join "`n" } else { "$Raw" }
    $line = ($text -split "`n" | Where-Object { $_.TrimStart().StartsWith("[") -or $_.TrimStart().StartsWith("{") } | Select-Object -First 1)
    if (-not $line) { return $null }
    return $line | ConvertFrom-Json
}

function Get-LumieraPm2AppRow {
    param([string]$AppName)
    $list = Convert-LumieraPm2Json (Invoke-LumieraPm2 @("jlist") -CaptureOutput)
    if (-not $list) { return $null }
    return $list | Where-Object { $_.name -eq $AppName } | Select-Object -First 1
}

function Test-LumieraPm2Mode {
    if (Test-Path -LiteralPath $script:Pm2ModeFile) {
        return $true
    }
    if (-not (Resolve-LumieraPm2Bin)) { return $false }
    try {
        return [bool](Get-LumieraPm2AppRow "lumiera-backend")
    } catch {
        return $false
    }
}

function Invoke-LumieraPm2 {
    param(
        [string[]]$Pm2Args,
        [switch]$CaptureOutput
    )
    Initialize-LumieraPm2Env
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $pm2 = Resolve-LumieraPm2Bin
    $runner = {
        param($Bin, $Args, $Capture)
        if ($Capture) {
            return & $Bin @Args 2>&1
        }
        & $Bin @Args 2>$null | Out-Null
        return $LASTEXITCODE
    }
    if ($pm2) {
        $result = & $runner $pm2 $Pm2Args $CaptureOutput.IsPresent
    } else {
        Push-Location $script:RepoRoot
        if ($CaptureOutput) {
            $result = & npx --yes pm2 @Pm2Args 2>&1
        } else {
            & npx --yes pm2 @Pm2Args 2>$null | Out-Null
            $result = $LASTEXITCODE
        }
        Pop-Location
    }
    $ErrorActionPreference = $prevEap
    return $result
}

function Test-BackendSyntaxOk {
    Ensure-LumieraLogDir
    $serverJs = Join-Path $script:BackendDir "server.js"
    if (-not (Test-Path -LiteralPath $serverJs)) { return $false }
    Push-Location $script:BackendDir
    $out = & node --check server.js 2>&1 | Out-String
    Pop-Location
    Set-Content -Path $script:SyntaxCheckLog -Value $out -Encoding UTF8
    return $LASTEXITCODE -eq 0
}

function Ensure-LumieraPm2Backend {
    param([switch]$Reload)

    if (-not (Resolve-LumieraPm2Bin) -and -not (Test-Path -LiteralPath $script:Pm2ModeFile)) {
        return $false
    }

    if ($Reload) {
        if (-not (Test-BackendSyntaxOk)) {
            Write-LumieraLog "PM2 reload bloqueado: server.js com erro de sintaxe" "ERROR"
            return $false
        }
        if (Test-ActiveLumieraRender) {
            Write-LumieraLog "PM2 reload com render ativo - reiniciando mesmo assim (codigo)" "WARN"
        }
        # restart (nao reload) — no Windows reload ESM pode manter rotas/modulos antigos
        $orphanPid = Get-BackendListenerPid
        if ($orphanPid) {
            Stop-LumieraBackendOnPort
        }
        Invoke-LumieraPm2 @("restart", "lumiera-backend", "--update-env") | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Invoke-LumieraPm2 @("start", (Join-Path $script:RepoRoot "ecosystem.config.cjs"), "--only", "lumiera-backend", "--update-env") | Out-Null
        }
        $deadline = (Get-Date).AddSeconds(120)
        while ((Get-Date) -lt $deadline) {
            if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 12) {
                Write-LumieraLog "PM2 reload OK - $script:HealthUrl"
                return $true
            }
            Start-Sleep -Seconds 2
        }
        Write-LumieraLog "PM2 reload: health lento" "WARN"
        return $true
    }

    $status = (Invoke-LumieraPm2 @("describe", "lumiera-backend") -CaptureOutput | Out-String)
    if ($status -match "online") {
        if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 10) {
            return $true
        }
        Write-LumieraLog "PM2 online mas health lento - aguardando" "WARN"
        $deadline = (Get-Date).AddSeconds(90)
        while ((Get-Date) -lt $deadline) {
            if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 12) { return $true }
            Start-Sleep -Seconds 2
        }
        Invoke-LumieraPm2 @("restart", "lumiera-backend", "--update-env") | Out-Null
        return $true
    }

    $ecosystem = Join-Path $script:RepoRoot "ecosystem.config.cjs"
    if (-not (Test-Path -LiteralPath $ecosystem)) { return $false }
    if (-not (Test-BackendSyntaxOk)) {
        Write-LumieraLog "PM2 start bloqueado: server.js com erro de sintaxe" "ERROR"
        return $false
    }
    Invoke-LumieraPm2 @("start", $ecosystem, "--only", "lumiera-backend", "--update-env") | Out-Null
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 12) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Repair-LumieraPm2Stack {
    Initialize-LumieraPm2Env
    Ensure-LumieraLogDir

    if (-not (Resolve-LumieraPm2Bin)) {
        Push-Location $script:RepoRoot
        npm install pm2 --save-dev --no-audit --no-fund 2>$null | Out-Null
        Pop-Location
    }
    if (-not (Resolve-LumieraPm2Bin)) {
        Write-LumieraLog "PM2 nao instalado - impossivel reparar stack" "ERROR"
        return $false
    }

    $ecosystem = Join-Path $script:RepoRoot "ecosystem.config.cjs"
    if (-not (Test-Path -LiteralPath $ecosystem)) { return $false }

    $backendHealthy = Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 8
    $frontendUp = [bool](Get-PortListenerPidFast 5176)
    if ($backendHealthy -and $frontendUp) {
        return $true
    }

    if (-not (Test-BackendSyntaxOk)) {
        Write-LumieraLog "Reparo bloqueado: server.js com erro de sintaxe" "ERROR"
        return $false
    }

    if (-not $backendHealthy -and -not (Test-ActiveLumieraRender)) {
        $stalePid = Get-BackendListenerPid
        if ($stalePid) {
            $beRow = Get-LumieraPm2AppRow "lumiera-backend"
            $pm2Healthy = $beRow -and $beRow.pm2_env.status -eq "online"
            if (-not $pm2Healthy) {
                Write-LumieraLog "Porta 3005 ocupada sem health - liberando antes do PM2" "WARN"
                Stop-LumieraBackendOnPort
                Start-Sleep -Seconds 2
            } else {
                Write-LumieraLog "Backend PM2 online com health lento - nao matar porta 3005" "WARN"
            }
        }
    }
    if (-not $frontendUp) {
        $fePid = Get-PortListenerPidFast 5176
        if ($fePid) {
            Write-LumieraLog ("Porta 5176 ocupada sem resposta - liberando PID {0}" -f $fePid) "WARN"
            Stop-Process -Id $fePid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }

    if (Test-ActiveLumieraRender -and -not $backendHealthy) {
        Write-LumieraLog "Render ativo - reparo do backend adiado" "WARN"
        if (-not $frontendUp) {
            Invoke-LumieraPm2 @("restart", "lumiera-frontend", "--update-env") | Out-Null
            $feDeadline = (Get-Date).AddSeconds(45)
            while ((Get-Date) -lt $feDeadline) {
                if (Get-PortListenerPidFast 5176) { return $false }
                Start-Sleep -Seconds 1
            }
        }
        return $false
    }

    if (-not (Test-LumieraPm2DaemonAlive)) {
        Write-LumieraLog "PM2 daemon offline - resurrect (sem kill)" "WARN"
        Invoke-LumieraPm2 @("resurrect") | Out-Null
        Start-Sleep -Seconds 6
        if (-not (Test-LumieraPm2DaemonAlive)) {
            Write-LumieraLog "PM2 resurrect falhou - reset sockets" "WARN"
            Reset-LumieraPm2Daemon | Out-Null
        }
    }

    $be = Get-LumieraPm2AppRow "lumiera-backend"
    $fe = Get-LumieraPm2AppRow "lumiera-frontend"

    if (-not $be -or -not $fe) {
        Write-LumieraLog "Apps PM2 ausentes - start ecosystem" "WARN"
        foreach ($app in @("lumiera-backend", "lumiera-frontend")) {
            Invoke-LumieraPm2 @("delete", $app) | Out-Null
        }
        Invoke-LumieraPm2 @("start", $ecosystem, "--update-env") | Out-Null
    } elseif (-not $backendHealthy) {
        $beStatus = $be.pm2_env.status
        if ($beStatus -eq "online") {
            Write-LumieraLog "Backend PM2 online sem health - restart" "WARN"
            Invoke-LumieraPm2 @("restart", "lumiera-backend", "--update-env") | Out-Null
        } else {
            Invoke-LumieraPm2 @("restart", "lumiera-backend", "--update-env") | Out-Null
        }
    }

    if (-not $frontendUp) {
        Invoke-LumieraPm2 @("restart", "lumiera-frontend", "--update-env") | Out-Null
    }

    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        $bh = Test-LumieraBackendHealthy -Retries 3 -TimeoutSec 15
        $fu = [bool](Get-PortListenerPidFast 5176)
        if ($bh -and $fu) {
            Invoke-LumieraPm2 @("save", "--force") | Out-Null
            Set-Content -Path $script:Pm2ModeFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
            Write-LumieraLog "Stack PM2 reparado - backend+frontend OK"
            return $true
        }
        Start-Sleep -Seconds 3
    }

    Write-LumieraLog "Reparo PM2: timeout - reset daemon + start limpo" "WARN"
    Reset-LumieraPm2Daemon | Out-Null
    Invoke-LumieraPm2 @("start", $ecosystem, "--update-env") | Out-Null
    $retryDeadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $retryDeadline) {
        $bh = Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 10
        $fu = [bool](Get-PortListenerPidFast 5176)
        if ($bh -and $fu) {
            Invoke-LumieraPm2 @("save", "--force") | Out-Null
            Write-LumieraLog "Stack PM2 reparado apos restart limpo"
            return $true
        }
        Start-Sleep -Seconds 2
    }

    Write-LumieraLog "Reparo PM2: timeout aguardando health/portas" "ERROR"
    return $false
}

function Test-LumieraWatchdogActive {
    $watchPidFile = Join-Path $script:LogDir "watchdog.pid"
    if (Test-Path -LiteralPath $watchPidFile) {
        try {
            $watchPid = [int](Get-Content -LiteralPath $watchPidFile -TotalCount 1 -ErrorAction Stop)
            if ($watchPid -gt 0) {
                $watchProc = Get-Process -Id $watchPid -ErrorAction SilentlyContinue
                if ($watchProc -and $watchProc.ProcessName -match "powershell") {
                    return @{ ProcessId = $watchPid }
                }
            }
        } catch { }
    }

    $watchScript = Join-Path $PSScriptRoot "watch-lumiera-backend.ps1"
    $watchName = Split-Path $watchScript -Leaf

    $proc = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -like "*$watchName*" -or $_.CommandLine -like "*watch-lumiera-backend*"
        } |
        Select-Object -First 1
    if ($proc) { return $proc }

    $task = Get-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -ErrorAction SilentlyContinue
    if ($task -and $task.State -eq "Running") {
        return @{ ProcessId = 0; FromTask = $true }
    }

    $watchLog = Join-Path $script:LogDir "backend-watch.log"
    if (Test-Path -LiteralPath $watchLog) {
        $age = (Get-Date) - (Get-Item -LiteralPath $watchLog).LastWriteTime
        if ($age.TotalSeconds -le 35) {
            return @{ ProcessId = 0; FromLog = $true }
        }
    }

    return $null
}
