# ============================================================================
#  lib-common.ps1 — helper bersama untuk semua script XyRDP (v2: Win10-style,
#  tanpa Tailscale). Dipakai dengan cara di-dot-source:
#
#      $XyTag = 'XyRDP:akses'
#      . "$PSScriptRoot/lib-common.ps1"
#
#  Berisi: logger, registry helper, pembaca konfigurasi (assets/rdp-extras.json),
#  pengelola hive profil Default, pembaca/penulis out/rdp-status.json.
# ============================================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13 } catch {}

# ---------- log ----------
function Log([string]$m) {
  $tag = if ($script:XyTag) { $script:XyTag } else { 'XyRDP' }
  Write-Host "[$tag] $m"
}

function Log-Tail([string]$text, [int]$lines = 2) {
  (($text -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -Last $lines) -join ' / '
}

# ---------- registry ----------
# Set-Reg: bikin key + value, tahan error (return $true/$false)
function Set-Reg([string]$Path, [string]$Name, $Value, [string]$Type = 'String') {
  try {
    New-Item -Path $Path -Force -ErrorAction Stop | Out-Null
    New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
    return $true
  } catch { Log "  reg gagal ($Path\$Name): $($_.Exception.Message)"; return $false }
}

function Get-Reg([string]$Path, [string]$Name) {
  try { return (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name } catch { return $null }
}

# ---------- konfigurasi (assets/rdp-extras.json) ----------
$script:XyCfgDefaults = [ordered]@{
  lightshot        = $true
  translucent      = $true
  translucent_mode = 'clear'          # normal | opaque | clear | blur | acrylic
  wallpaper        = $true
  wallpaper_file   = 'wallpaper.jpg'
  win10_look       = $true            # semua tweak tampilan Windows 10
  win10_badge      = $true            # label "Windows 10 Pro" di registry (kosmetik)
  win10_wallpaper  = $true            # pakai wallpaper gaya Windows 10
  xydesk_host      = $true            # host setup untuk klien XyDesk Remote (AVC444/ClearType/audio)
}

function Get-CfgBool([object]$o, [string]$n, [bool]$d) {
  if (-not $o) { return $d }
  $p = $o.PSObject.Properties[$n]
  if ($p -and $null -ne $p.Value) { return [bool]$p.Value }
  return $d
}
function Get-CfgStr([object]$o, [string]$n, [string]$d) {
  if (-not $o) { return $d }
  $p = $o.PSObject.Properties[$n]
  if ($p -and $null -ne $p.Value -and "$($p.Value)".Trim()) { return "$($p.Value)".Trim() }
  return $d
}

# Get-Cfg -> pscustomobject berisi semua setting (default + isi repo)
function Get-Cfg {
  $j = $null
  $path = Join-Path (Get-Workspace) 'assets\rdp-extras.json'
  if (Test-Path $path) {
    try { $j = Get-Content $path -Raw | ConvertFrom-Json; Log 'konfigurasi: assets/rdp-extras.json' }
    catch { Log "rdp-extras.json tidak terbaca ($($_.Exception.Message)) — pakai default" }
  } else { Log 'assets/rdp-extras.json tidak ada — pakai default' }

  $c = [pscustomobject]@{}
  foreach ($k in $script:XyCfgDefaults.Keys) {
    $c | Add-Member -NotePropertyName $k -NotePropertyValue $script:XyCfgDefaults[$k] -Force
  }
  if ($j) {
    foreach ($k in @('lightshot','translucent','wallpaper','win10_look','win10_badge','win10_wallpaper','xydesk_host')) {
      $c.$k = Get-CfgBool $j $k $c.$k
    }
    $c.translucent_mode = (Get-CfgStr $j 'translucent_mode' $c.translucent_mode).ToLower()
    $c.wallpaper_file   = (Get-CfgStr $j 'wallpaper_file'   $c.wallpaper_file).ToLower()
  }
  return $c
}

# ---------- lokasi repo (Actions: GITHUB_WORKSPACE, lokal: folder script/..) ----------
function Get-Workspace {
  if ($env:GITHUB_WORKSPACE) { return $env:GITHUB_WORKSPACE }
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

# ---------- status file (out/rdp-status.json) ----------
function Get-StatusPath {
  return (Join-Path (Get-Workspace) 'out\rdp-status.json')
}

function Read-Status {
  $p = Get-StatusPath
  if (-not (Test-Path $p)) { Log "status: $p belum ada"; return $null }
  try { return (Get-Content $p -Raw | ConvertFrom-Json) } catch { Log "status tidak terbaca: $($_.Exception.Message)"; return $null }
}

# Update-Status @{ key = value } — merge + tulis balik (tanpa password)
function Update-Status([hashtable]$Pairs) {
  $p = Get-StatusPath
  $obj = Read-Status
  if (-not $obj) { $obj = [pscustomobject]@{} }
  foreach ($k in $Pairs.Keys) {
    $obj | Add-Member -NotePropertyName $k -NotePropertyValue $Pairs[$k] -Force
  }
  try {
    New-Item -ItemType Directory -Path (Split-Path $p -Parent) -Force | Out-Null
    ($obj | ConvertTo-Json -Depth 8) | Set-Content -Path $p -Encoding utf8
    return $true
  } catch { Log "tulis status gagal: $($_.Exception.Message)"; return $false }
}

# ---------- hive profil Default (setting ikut user RDP saat login pertama) ----------
$script:DefHiveKey = 'XyRDP_Def'
$script:DefHive    = 'HKU\XyRDP_Def'
$script:DefReg     = 'Registry::HKEY_USERS\XyRDP_Def'
$script:HiveLoaded = $false

function Open-DefaultHive {
  if ($script:HiveLoaded) { return $true }
  try {
    & reg load $script:DefHive 'C:\Users\Default\NTUSER.DAT' 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
    if (Test-Path $script:DefReg) { $script:HiveLoaded = $true; Log 'profil Default di-load (setting ikut user RDP saat login pertama)'; return $true }
  } catch { Log "load profil Default gagal: $($_.Exception.Message)" }
  $script:HiveLoaded = $false
  return $false
}

function Close-DefaultHive {
  if (-not $script:HiveLoaded) { return }
  try {
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    & reg unload $script:DefHive 2>&1 | Out-Null
    $script:HiveLoaded = $false
    Log 'profil Default di-unload'
  } catch { Log "unload hive (tidak kritis): $($_.Exception.Message)" }
}

# Set-RegDefault: tulis ke profil Default DAN ke HKCU sesi sekarang
function Set-RegBoth([string]$SubKey, [string]$Name, $Value, [string]$Type = 'DWord') {
  Open-DefaultHive | Out-Null
  if ($script:HiveLoaded) { Set-Reg ($script:DefReg + '\' + $SubKey) $Name $Value $Type | Out-Null }
  Set-Reg ('Registry::HKEY_CURRENT_USER\' + $SubKey) $Name $Value $Type | Out-Null
}

# ---------- util gambar ----------
function Get-ImageExt([byte[]]$b) {
  if ($b.Length -ge 3 -and $b[0] -eq 0xFF -and $b[1] -eq 0xD8 -and $b[2] -eq 0xFF) { return 'jpg' }
  if ($b.Length -ge 8 -and $b[0] -eq 0x89 -and $b[1] -eq 0x50 -and $b[2] -eq 0x4E -and $b[3] -eq 0x47) { return 'png' }
  if ($b.Length -ge 2 -and $b[0] -eq 0x42 -and $b[1] -eq 0x4D) { return 'bmp' }
  return $null
}

# ---------- jaringan ----------
function Get-PrimaryIPv4 {
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
          Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
          Sort-Object -Property SkipAsSource | Select-Object -First 1
    if ($ip) { return $ip.IPAddress }
  } catch {}
  return '0.0.0.0'
}

# ---------- unduhan ----------
function Get-File([string]$Url, [string]$OutFile, [int]$TimeoutSec = 180) {
  for ($i = 1; $i -le 3; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -TimeoutSec $TimeoutSec
      if ((Test-Path $OutFile) -and ((Get-Item $OutFile).Length -gt 0)) { return $true }
    } catch { Log "  unduh gagal (coba $i/3): $($_.Exception.Message)"; Start-Sleep -Seconds 3 }
  }
  return $false
}

# Get-GhAssetUrl <owner/repo> <regex nama asset> -> url unduhan asset terbaru
function Get-GhAssetUrl([string]$Repo, [string]$NameRegex) {
  try {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'XyRDP' } -TimeoutSec 60
    $a = $rel.assets | Where-Object { $_.name -match $NameRegex } | Select-Object -First 1
    if ($a) { return @{ url = $a.browser_download_url; tag = $rel.tag_name; name = $a.name } }
  } catch { Log "  GitHub API ($Repo) gagal: $($_.Exception.Message)" }
  return $null
}

Log 'lib-common dimuat'
