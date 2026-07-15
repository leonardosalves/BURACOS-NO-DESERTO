# Limpa somente caches temporarios conhecidos e orfaos do Lumiera/Remotion.
# Por seguranca, a simulacao e o comportamento padrao. Use -Apply para excluir.
param(
    [switch]$Apply,
    [switch]$IncludeExternalCaches,
    [switch]$Quiet,
    [string]$TempRoot = [System.IO.Path]::GetTempPath(),
    [int]$MinimumAgeHours = 24,
    [datetime]$BootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
)

$ErrorActionPreference = "Stop"

function Get-DirectorySizeBytes([string]$Path) {
    $total = 0L
    Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
        ForEach-Object { $total += [int64]$_.Length }
    return $total
}

function Get-CacheCategory([string]$Name) {
    switch -Regex ($Name) {
        '^remotion-webpack-bundle-' { return "Remotion bundle" }
        '^remotion-v[0-9].*-assets' { return "Remotion assets" }
        '^react-motion-render' { return "Remotion render" }
        '^puppeteer_dev_chrome_profile-' { return "Puppeteer profile" }
        '^_MEI[0-9]+$' { return "PyInstaller _MEI" }
        '^HeadlessEdge[0-9]+$' { return "Headless Edge" }
        default { return $null }
    }
}

$resolvedTemp = (Resolve-Path -LiteralPath $TempRoot).Path.TrimEnd('\')
$cutoff = (Get-Date).AddHours(-[Math]::Max(1, $MinimumAgeHours))
$appCategories = @("Remotion bundle", "Remotion assets", "Remotion render", "Puppeteer profile")
$externalCategories = @("PyInstaller _MEI", "Headless Edge")
$allowedCategories = if ($IncludeExternalCaches) {
    $appCategories + $externalCategories
} else {
    $appCategories
}

$candidates = @()
foreach ($directory in Get-ChildItem -LiteralPath $resolvedTemp -Directory -Force -ErrorAction SilentlyContinue) {
    $category = Get-CacheCategory $directory.Name
    if (-not $category -or $allowedCategories -notcontains $category) { continue }

    # Um cache criado antes do boot atual nao pode pertencer a um processo ainda ativo.
    if ($directory.LastWriteTime -ge $BootTime -or $directory.LastWriteTime -ge $cutoff) { continue }
    if (($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }

    $resolvedPath = $directory.FullName
    if (-not $resolvedPath.StartsWith($resolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase)) { continue }

    $bytes = Get-DirectorySizeBytes $resolvedPath
    $candidates += [pscustomobject]@{
        Category = $category
        Name = $directory.Name
        Path = $resolvedPath
        LastWriteTime = $directory.LastWriteTime
        Bytes = $bytes
        SizeGB = [Math]::Round($bytes / 1GB, 3)
        Removed = $false
        Error = $null
    }
}

if ($Apply) {
    foreach ($candidate in $candidates) {
        try {
            Remove-Item -LiteralPath $candidate.Path -Recurse -Force -ErrorAction Stop
            $candidate.Removed = -not (Test-Path -LiteralPath $candidate.Path)
        } catch {
            $candidate.Error = $_.Exception.Message
        }
    }
}

$totalBytes = [int64](($candidates | Measure-Object -Property Bytes -Sum).Sum)
$removedBytes = [int64](($candidates | Where-Object Removed | Measure-Object -Property Bytes -Sum).Sum)
$result = [pscustomobject]@{
    Mode = if ($Apply) { "apply" } else { "dry-run" }
    TempRoot = $resolvedTemp
    BootTime = $BootTime
    MinimumAgeHours = [Math]::Max(1, $MinimumAgeHours)
    IncludeExternalCaches = [bool]$IncludeExternalCaches
    CandidateCount = $candidates.Count
    CandidateGB = [Math]::Round($totalBytes / 1GB, 3)
    RemovedCount = @($candidates | Where-Object Removed).Count
    RemovedGB = [Math]::Round($removedBytes / 1GB, 3)
    FailedCount = @($candidates | Where-Object Error).Count
    Items = $candidates
}

if (-not $Quiet) {
    $verb = if ($Apply) { "removidos" } else { "encontrados (simulacao)" }
    Write-Host ("Caches {0}: {1} pasta(s), {2:N3} GB." -f $verb, $result.CandidateCount, $result.CandidateGB)
    $candidates |
        Group-Object Category |
        ForEach-Object {
            $groupBytes = ($_.Group | Measure-Object Bytes -Sum).Sum
            Write-Host ("  {0}: {1} pasta(s), {2:N3} GB" -f $_.Name, $_.Count, ($groupBytes / 1GB))
        }
    if ($result.FailedCount -gt 0) {
        Write-Warning ("{0} pasta(s) nao puderam ser removidas; serao tentadas novamente." -f $result.FailedCount)
    }
}

return $result
