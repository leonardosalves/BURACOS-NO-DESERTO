# Funções compartilhadas — iniciar/verificar backend Lumiera (porta 3005)
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

function Get-BackendListenerPid {
    $conn = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn -and $conn.OwningProcess -and $conn.OwningProcess -ne 0) {
        return [int]$conn.OwningProcess
    }
    return $null
}

function Test-LumieraBackendHealthy {
    param(
        [int]$Retries = 3,
        [int]$TimeoutSec = 45
    )
    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec $TimeoutSec
            if ($r.StatusCode -eq 200) {
                return $true
            }
        } catch {
            if ($i -lt $Retries) {
                Start-Sleep -Milliseconds 400
            }
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
    if (-not (Test-Path $script:RestartLockFile)) { return $false }
    try {
        $stamp = [datetime]::Parse((Get-Content $script:RestartLockFile -TotalCount 1 -ErrorAction Stop))
        if (((Get-Date) - $stamp).TotalSeconds -lt 90) { return $true }
        Remove-Item $script:RestartLockFile -Force -ErrorAction SilentlyContinue
    } catch {
        Remove-Item $script:RestartLockFile -Force -ErrorAction SilentlyContinue
    }
    return $false
}

function Set-BackendRestartLock {
    Ensure-LumieraLogDir
    Set-Content -Path $script:RestartLockFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
}

function Clear-BackendRestartLock {
    Remove-Item $script:RestartLockFile -Force -ErrorAction SilentlyContinue
}

function Test-ActiveLumieraRender {
    $jobsDir = Join-Path $script:RepoRoot ".lumiera-logs\render-jobs"
    if (-not (Test-Path $jobsDir)) { return $false }
    $cutoff = (Get-Date).AddHours(-4)
    foreach ($file in Get-ChildItem $jobsDir -Filter "*.json" -ErrorAction SilentlyContinue) {
        try {
            $job = Get-Content $file.FullName -Raw -ErrorAction Stop | ConvertFrom-Json
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
    $connections = Get-NetTCPConnection -LocalPort $script:BackendPort -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -ne 0) {
            $pids += [int]$procId
        }
    }
    foreach ($procId in ($pids | Select-Object -Unique)) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    if ($pids.Count -gt 0) {
        Write-LumieraLog ("Processo(s) encerrado(s) na porta {0}: {1}" -f $script:BackendPort, ($pids -join ", "))
    }
    [void](Wait-BackendPortFree -TimeoutSec 20)
    Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
}

function Start-LumieraBackendProcess {
    param(
        [switch]$ForceRestart,
        [switch]$SkipDebounce
    )

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

    if (Test-BackendRestartLock) {
        Write-LumieraLog "Reinicio ja em andamento (lock) - aguardando" "WARN"
        $deadline = (Get-Date).AddSeconds(120)
        while ((Get-Date) -lt $deadline) {
            if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 8) {
                return $true
            }
            Start-Sleep -Milliseconds 800
        }
    }

    $livePid = Get-BackendListenerPid
    $healthy = Test-LumieraBackendHealthy

    if ($ForceRestart -and (Test-ActiveLumieraRender)) {
        Write-LumieraLog "Render ativo — ForceRestart bloqueado (nao interromper video)" "WARN"
        if ($livePid) { Write-BackendPidFile $livePid }
        return $true
    }

    if ($healthy) {
        if (-not $ForceRestart) {
            Write-LumieraLog "Backend ja responde em $script:HealthUrl"
            if ($livePid) { Write-BackendPidFile $livePid }
            return $true
        }
        Write-LumieraLog "Reiniciando backend (ForceRestart)" "WARN"
    } elseif ($livePid -and -not $ForceRestart) {
        Write-LumieraLog (
            "Backend ocupado (PID $livePid) - health lento, mantendo processo ativo"
        ) "WARN"
        Write-BackendPidFile $livePid
        return $true
    } elseif (-not $livePid) {
        Write-LumieraLog "Backend offline - subindo processo" "WARN"
    } else {
        Write-LumieraLog ("ForceRestart: encerrando PID $livePid na porta $script:BackendPort") "WARN"
    }

    if (-not $ForceRestart) {
        if ($livePid) {
            Write-BackendPidFile $livePid
            return $true
        }
        Set-BackendRestartLock
    } elseif (-not $SkipDebounce -and (Test-Path $script:LastRestartFile)) {
        try {
            $last = [datetime]::Parse((Get-Content $script:LastRestartFile -TotalCount 1 -ErrorAction Stop))
            if (((Get-Date) - $last).TotalSeconds -lt 60) {
                Write-LumieraLog "Debounce ForceRestart: reinicio recente (<60s) - aguardando" "WARN"
                $deadline = (Get-Date).AddSeconds(90)
                while ((Get-Date) -lt $deadline) {
                    if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 15) { return $true }
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
        $nodeArgs = @(
            "--max-old-space-size=$($script:NodeMaxOldSpaceMb)",
            "server.js"
        )

        Write-LumieraLog "Iniciando node server.js em $script:BackendDir"
        $proc = Start-Process `
            -FilePath "node" `
            -ArgumentList $nodeArgs `
            -WorkingDirectory $script:BackendDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $stdout `
            -RedirectStandardError $stderr `
            -PassThru

        if ($proc -and $proc.Id) {
            Write-BackendPidFile $proc.Id
        }

        Set-Content -Path $script:LastRestartFile -Value ((Get-Date).ToString("o")) -Encoding UTF8

        $deadline = (Get-Date).AddSeconds(90)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 800
            if (Test-LumieraBackendHealthy -Retries 3 -TimeoutSec 20) {
                $livePid = Get-BackendListenerPid
                if ($livePid) { Write-BackendPidFile $livePid }
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
                    $livePid = Get-BackendListenerPid
                    if ($livePid) { Write-BackendPidFile $livePid }
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