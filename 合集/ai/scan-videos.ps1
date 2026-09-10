# scan videos folder:
#  - update videos.json (file + duration)
#  - sync FALLBACK_FILES / FALLBACK_DUR in index.html
#  - extract missing thumbs into videos/thumbs/
# usage: powershell -ExecutionPolicy Bypass -File scan-videos.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$videosDir = Join-Path $root 'videos'
$thumbDir = Join-Path $videosDir 'thumbs'
$jsonPath = Join-Path $root 'videos.json'
$htmlPath = Join-Path $root 'index.html'
$ff = $env:FFMPEG
if (-not $ff) {
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) { $ff = $cmd.Source }
  elseif (Test-Path 'D:\ComfyUI\ffmpeg\ffmpeg.exe') { $ff = 'D:\ComfyUI\ffmpeg\ffmpeg.exe' }
}

if (-not (Test-Path $videosDir)) {
  Write-Host "Missing folder: $videosDir" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $thumbDir)) { New-Item -ItemType Directory -Path $thumbDir | Out-Null }

$files = @(Get-ChildItem -Path $videosDir -File -Filter *.mp4 | Sort-Object Name | ForEach-Object { $_.Name })
if (-not $files.Count) {
  Write-Host "No mp4 in videos folder" -ForegroundColor Yellow
  exit 0
}

$items = @()
foreach ($f in $files) {
  $path = Join-Path $videosDir $f
  $dur = 0
  if ($ff) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = (& $ff -i $path 2>&1 | Out-String)
    if ($out -match 'Duration:\s*(\d+):(\d+):(\d+\.\d+)') {
      $dur = [double]$matches[1] * 3600 + [double]$matches[2] * 60 + [double]$matches[3]
    }
    $base = [IO.Path]::GetFileNameWithoutExtension($f)
    $jpg = Join-Path $thumbDir ($base + '.jpg')
    if (-not (Test-Path $jpg)) {
      & $ff -y -ss 2 -i $path -frames:v 1 -vf "scale=640:-2" -q:v 4 $jpg 2>$null | Out-Null
      if (Test-Path $jpg) { Write-Host ("thumb: {0}" -f ($base + '.jpg')) }
    }
    $ErrorActionPreference = $prevEap
  }
  $items += [ordered]@{ file = $f; duration = [math]::Round($dur, 2) }
}

$jsonBody = ($items | ConvertTo-Json -Depth 3) + "`n"
[System.IO.File]::WriteAllText($jsonPath, $jsonBody, (New-Object System.Text.UTF8Encoding($false)))

if (Test-Path $htmlPath) {
  $html = [System.IO.File]::ReadAllText($htmlPath)
  $fileLines = @()
  $durLines = @()
  foreach ($it in $items) {
    $fileLines += '  "' + $it.file + '"'
    $durLines += '  "' + $it.file + '": ' + $it.duration
  }
  $fallback = "const FALLBACK_FILES = [`n" + ($fileLines -join ",`n") + "`n];"
  $durBlock = "const FALLBACK_DUR = {`n" + ($durLines -join ",`n") + "`n};"
  $html = [regex]::Replace($html, '(?s)const FALLBACK_FILES = \[.*?\];', { param($m) $fallback })
  $html = [regex]::Replace($html, '(?s)const FALLBACK_DUR = \{.*?\};', { param($m) $durBlock })
  [System.IO.File]::WriteAllText($htmlPath, $html, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Synced index.html fallback lists" -ForegroundColor Green
}

Write-Host ("Updated videos.json (" + $items.Count + " files):") -ForegroundColor Green
$items | ForEach-Object { Write-Host ("  - {0}  ({1}s)" -f $_.file, $_.duration) }
Write-Host "Refresh the page to see new videos."
