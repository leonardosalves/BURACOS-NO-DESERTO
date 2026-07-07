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

function Ensure-LumieraLogDir {
    if (-not (Test-Path -LiteralPath $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }
}

function Write-LumieraLog {
    param([string]$Message, [string]$Level = "INFO")
    Ensure-LumieraLogDir
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -Path (Join-Path $script:LogDir "backend-watch.log") -Value $line -Encoding UTF8
}

function Get-BackendListenerPid {
    try {
        $conn = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess -and $conn.OwningProcess -ne 0) {
            return [int]$conn.OwningProcess
        }
    } catch { }

    try {
        $line = & netstat -ano 2>$null | Select-String -Pattern ":$($script:BackendPort)\s+.*LISTENING" | Select-Object -First 1
        if ($line -and ($line.ToString() -match "\s(\d+)\s*$")) {
            return [int]$Matches[1]
        }
    } catch { }
    return $null
}

function Test-LumieraBackendHealthy {
    param(
        [int]$Retries = 3,
        [int]$TimeoutSec = 8
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec $TimeoutSec -Headers @{ "Connection" = "close" }
            if ($r.StatusCode -eq 200 -and $r.Content -match '"ok"\s*:\s*true') {
                return $true
            }
        } catch {
            $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
            if ($curl) {
                try {
                    $body = & curl.exe -sS --max-time $TimeoutSec $script:HealthUrl 2>$null
                    if ($LASTEXITCODE -eq 0 -and $body -match '"ok"\s*:\s*true') {
                        return $true
                    }
                } catch { }
            }
        }
        if ($i -lt $Retries) {
            Start-Sleep -Milliseconds 500
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
            } else {
                return $true
            }
        } catch { }
    }
    return $false
}

function Write-BackendPidFile([int]$Pid) {
    Ensure-LumieraLogDir
    Set-Content -Path $script:PidFile -Value $Pid -Encoding UTF8
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
    try {
        $connections = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
                $pids += [int]$conn.OwningProcess
            }
        }
    } catch { }

    if ($pids.Count -eq 0) {
        $listenerPid = Get-BackendListenerPid
        if ($listenerPid) { $pids += $listenerPid }
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

function Start-LumieraBackendProcess {
    param(
        [switch]$ForceRestart,
        [switch]$SkipDebounce
    )

    Initialize-LumieraBackendEnv

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

function Test-LumieraWatchdogActive {
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
