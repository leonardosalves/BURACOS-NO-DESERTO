# BlenderGIS + Python deps (Pillow/PyProj) for Lumiera satellite flyover
# Usage: .\scripts\install-blendergis.ps1
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DepsDir = Join-Path $RepoRoot "dashboard-qanat\scripts\blender\python-deps"
$BlenderGisRepo = "https://github.com/domlysz/BlenderGIS.git"

function Resolve-BlenderExe {
    if ($env:BLENDER_PATH -and (Test-Path $env:BLENDER_PATH)) {
        return (Resolve-Path $env:BLENDER_PATH).Path
    }
    $candidates = @(
        "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    throw "Blender not found. Install Blender 4.x/5.x or set BLENDER_PATH."
}

function Resolve-BlenderVersion([string]$BlenderExe) {
    $out = & $BlenderExe --version 2>&1 | Out-String
    if ($out -match "Blender\s+(\d+\.\d+)") { return $Matches[1] }
    throw "Could not detect Blender version."
}

function Resolve-BlenderPython([string]$BlenderExe) {
    $expr = "import sys; print(sys.executable)"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $lines = & $BlenderExe --background --python-expr $expr 2>&1
        $py = $lines | Where-Object { "$_" -match "python\.exe$" } | Select-Object -Last 1
    } finally {
        $ErrorActionPreference = $prev
    }
    if (-not $py) { throw "Blender embedded Python not found." }
    return "$py".Trim()
}

Write-Host "=== Lumiera BlenderGIS ===" -ForegroundColor Cyan
$BlenderExe = Resolve-BlenderExe
$BlenderVer = Resolve-BlenderVersion $BlenderExe
$AddonsDir = Join-Path $env:APPDATA "Blender Foundation\Blender\$BlenderVer\scripts\addons"
$AddonPath = Join-Path $AddonsDir "blendergis"

Write-Host "Blender: $BlenderExe ($BlenderVer)" -ForegroundColor DarkGray

New-Item -ItemType Directory -Path $AddonsDir -Force | Out-Null
if (-not (Test-Path (Join-Path $AddonPath "__init__.py"))) {
    Write-Host "Cloning BlenderGIS to $AddonPath ..." -ForegroundColor Cyan
    if (Test-Path $AddonPath) { Remove-Item -Recurse -Force $AddonPath }
    git clone --depth 1 $BlenderGisRepo $AddonPath
} else {
    Write-Host "BlenderGIS already installed: $AddonPath" -ForegroundColor Green
}

New-Item -ItemType Directory -Path $DepsDir -Force | Out-Null
$BlenderPy = Resolve-BlenderPython $BlenderExe
Write-Host "Installing Pillow + PyProj into $DepsDir ..." -ForegroundColor Cyan
& $BlenderPy -m pip install --upgrade --target $DepsDir pillow pyproj 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }

$EnableScript = Join-Path $env:TEMP "lumiera-enable-blendergis.py"
$depsEscaped = $DepsDir -replace "\\", "\\\\"
@"
import sys
from pathlib import Path
deps = Path(r"$DepsDir")
if deps.is_dir() and str(deps) not in sys.path:
    sys.path.insert(0, str(deps))
import bpy
bpy.ops.preferences.addon_enable(module="blendergis")
bpy.ops.wm.save_userpref()
enabled = "blendergis" in bpy.context.preferences.addons
import importlib
from blendergis.core import checkdeps
importlib.reload(checkdeps)
print("BLENDERGIS_OK" if enabled else "BLENDERGIS_FAIL")
print("PIL", checkdeps.HAS_PIL, "PYPROJ", checkdeps.HAS_PYPROJ, "GDAL", checkdeps.HAS_GDAL)
"@ | Set-Content -Encoding utf8 $EnableScript

$env:PYTHONPATH = $DepsDir
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $verify = (& $BlenderExe --background --python $EnableScript 2>&1 | Out-String)
} finally {
    $ErrorActionPreference = $prev
}
Write-Host $verify -ForegroundColor DarkGray

if ($verify -match "BLENDERGIS_OK") {
    Write-Host "BlenderGIS enabled and preferences saved." -ForegroundColor Green
} else {
    Write-Host "Failed to enable BlenderGIS. Check logs above." -ForegroundColor Red
    exit 1
}

if ($verify -match "PIL True.*PYPROJ True") {
    Write-Host "Pillow + PyProj OK for BlenderGIS." -ForegroundColor Green
} else {
    Write-Host "Warning: Pillow/PyProj may not be visible (GDAL optional for DEM)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Lumiera uses Blender headless + Esri texture fallback." -ForegroundColor Green
Write-Host "Restart backend if running: .\scripts\restart-backend.ps1 -Force" -ForegroundColor DarkGray