# ============================================================================
#  setup-xydesk.ps1 — HOST SETUP untuk XyDesk Remote (APK Android kamu)
# ----------------------------------------------------------------------------
#  Ini versi inline dari rdp.xydesk.my.id/host.ps1 (v0.5.34) + perbaikan font
#  smoothing dari commit XyDesk-Remote v0.5.30, dijalankan langsung dari repo
#  (tidak mengambil script dari internet).
#
#  Isi (idempoten, best-effort — semua hasil dilaporkan apa adanya):
#    1) RDP: multi-session (fSingleSessionPerUser=0) + audio out & mic hidup
#    2) Kebijakan grafis: AVC444 4:4:4 (preferred) + hardware encode + VGAdapter
#    3) Font smoothing: fNoFontSmoothing=0 + AllowFontAntiAlias=1 di
#       WinStations\RDP-Tcp  (kunci ini yang BENAR-benar dibaca Windows;
#       fAllowFontAntiAlias di Policy no-op — temuan commit XyDesk-Remote v0.5.30)
#    4) Firewall: TCP/UDP 3389 + UDP 4433 (audio bridge QUIC XyDesk)
#    5) Layanan: TermService + Audiosrv dipastikan jalan
#
#  PENTING soal jalur akses:
#    - XyDesk Remote -> "Koneksi RDP Penuh": isi Host + Port dari dashboard
#      (host = bore.pub / x.tcp.ngrok.io, port = angka tunnel). Semua fitur RDP
#      (AVC444, ClearType, audio rdpsnd, clipboard, keyboard) jalan lewat tunnel TCP.
#    - Audio bridge QUIC XyDesk (UDP 4433) TIDAK bisa lewat tunnel TCP — port UDP
#      dibuka di sini supaya siap kalau HP bisa reach UDP langsung (LAN/tailnet).
#      Lewat tunnel, klien otomatis fallback ke audio RDP.
#    - Klien XyDesk akan probe QUIC 4433 lalu gagal (wajar) -> lanjut mode RDP.
#
#  Konfigurasi: assets/rdp-extras.json -> xydesk_host = true/false
# ============================================================================

$XyTag = 'XyRDP:xydesk'
. "$PSScriptRoot/lib-common.ps1"

$cfg = Get-Cfg
$skip = -not $cfg.xydesk_host
if ($env:XYDESK) {
  $e = $env:XYDESK.Trim().ToLower()
  if (@('tidak', '0', 'false', 'no', 'off', 'skip', 'none') -contains $e) { $skip = $true }
}
if ($skip) {
  Log 'host setup XyDesk dilewati (input xydesk=tidak atau xydesk_host=false di rdp-extras.json)'
  Update-Status @{ xydesk = @{ host = 'skip' } } | Out-Null
  exit 0
}

Log 'HOST SETUP XyDesk Remote (AVC444 + ClearType + multi-session + audio)...'
$tsRoot = 'Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server'
$tsPol  = 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
$tsTcp  = "$tsRoot\WinStations\RDP-Tcp"

# ---------- 1. RDP: multi-session + audio ----------
$okDeny  = Set-Reg $tsRoot 'fDenyTSConnections'   0 'DWord'
$okMulti = Set-Reg $tsRoot 'fSingleSessionPerUser' 0 'DWord'
Set-Reg $tsPol 'fDenyTSConnections'   0 'DWord' | Out-Null
Set-Reg $tsPol 'fSingleSessionPerUser' 0 'DWord' | Out-Null
$okAudio = Set-Reg $tsTcp 'fDisableAudio'        0 'DWord'
$okMic   = Set-Reg $tsTcp 'fDisableAudioCapture' 0 'DWord'
Log "  RDP: denyTS=$okDeny multisesi=$okMulti audio-out=$okAudio mic=$okMic"

# ---------- 2. Kebijakan grafis XyDesk (AVC444 / hardware encode) ----------
$okAvc  = Set-Reg $tsPol 'AVC444ModePreferred'       1 'DWord'
$okAvc2 = Set-Reg $tsPol 'AVCHardwareEncodePreferred' 1 'DWord'
Set-Reg $tsPol 'VGAdapter'            1 'DWord' | Out-Null
Set-Reg $tsPol 'bEnumerateHWBeforeSW' 1 'DWord' | Out-Null
Set-Reg $tsPol 'SelectTransport'      0 'DWord' | Out-Null
Set-Reg $tsPol 'fAllowDesktopComposition' 1 'DWord' | Out-Null
$avcTxt = if ($okAvc -and $okAvc2) { 'ok' } else { 'gagal' }
Log "  grafis: AVC444ModePreferred+AVCHardwareEncodePreferred -> $avcTxt"

# ---------- 3. Font smoothing (kunci yang benar-benar dibaca Windows) ----------
$okFs1 = Set-Reg $tsTcp 'fNoFontSmoothing'   0 'DWord'
$okFs2 = Set-Reg $tsTcp 'AllowFontAntiAlias' 1 'DWord'
Set-Reg $tsPol 'fAllowFontAntiAlias' 1 'DWord' | Out-Null   # kunci lama (no-op) untuk kompatibilitas
$fontTxt = if ($okFs1 -and $okFs2) { 'ok' } elseif ($okFs1 -or $okFs2) { 'sebagian' } else { 'gagal' }
Log "  font smoothing: $fontTxt (fNoFontSmoothing=0, AllowFontAntiAlias=1 di WinStations\RDP-Tcp)"
if ($fontTxt -ne 'ok') { Log '  (kalau gagal: teks di sesi bisa tampak kurang halus)' }

# ---------- 4. Firewall (dibuka di VM; dari luar tetap hanya via tunnel) ----------
function Add-FwRule([string]$Name, [string]$Proto, [string]$Ports) {
  try {
    Remove-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow `
      -Protocol $Proto -LocalPort $Ports -Profile Any -ErrorAction Stop | Out-Null
    return $true
  } catch { Log "  firewall '$Name' gagal: $($_.Exception.Message)"; return $false }
}
$fwTcp  = Add-FwRule 'XyDesk Remote RDP TCP'  'TCP' '3389'
$fwUdp  = Add-FwRule 'XyDesk Remote RDP UDP'  'UDP' '3389'
$fw4433 = Add-FwRule 'XyDesk Remote QUIC UDP' 'UDP' '4433'
Enable-NetFirewallRule -DisplayGroup 'Remote Desktop' -ErrorAction SilentlyContinue | Out-Null
Log "  firewall: TCP3389=$fwTcp UDP3389=$fwUdp UDP4433=$fw4433"

# ---------- 5. Layanan ----------
$svcOk = @()
foreach ($svc in @('TermService', 'Audiosrv')) {
  try {
    Set-Service -Name $svc -StartupType Automatic -ErrorAction Stop
    Start-Service -Name $svc -ErrorAction Stop
    $svcOk += $svc
  } catch { Log "  layanan $svc gagal: $($_.Exception.Message)" }
}
try { Start-Service -Name 'UmRdpService' -ErrorAction SilentlyContinue } catch {}
$svcTxt = if ($svcOk.Count -eq 2) { 'ok' } elseif ($svcOk.Count -eq 1) { "sebagian ($($svcOk[0]) hidup)" } else { 'gagal' }
Log "  layanan: $svcTxt"

# ---------- 6. Jalur akses yang dipakai dari HP ----------
$st = Read-Status
$addr = ''
if ($st -and $st.akses -and $st.akses.tunnel) { $addr = "$($st.akses.tunnel.address)" }
if ($addr) {
  Log "  dari HP (XyDesk Remote -> Koneksi RDP): Host/Port = $addr, user $(if ($env:RDP_USER) { $env:RDP_USER } else { 'xyadmin' })"
} else {
  Log '  tunnel belum siap di step ini (setup akses jalan setelah ini) — alamat host:port menyusul di dashboard'
}
Log '  catatan: audio bridge QUIC (UDP 4433) hanya jalan kalau HP reach UDP langsung; lewat tunnel TCP klien otomatis fallback ke audio RDP (suara tetap ada)'

# ---------- 7. Status (apa adanya, bukan asumsi) ----------
$allOk = $okDeny -and $okMulti -and $okAudio -and $okMic -and $okAvc -and $okAvc2 -and ($fontTxt -eq 'ok')
Update-Status @{ xydesk = [ordered]@{
    host          = if ($allOk) { 'ok' } else { 'sebagian' }
    denyts        = if ($okDeny) { 'ok' } else { 'gagal' }
    multisession  = if ($okMulti) { 'ok' } else { 'gagal' }
    avc444        = $avcTxt
    fontsmoothing = $fontTxt
    audio_out     = if ($okAudio) { 'ok' } else { 'gagal' }
    audio_mic     = if ($okMic) { 'ok' } else { 'gagal' }
    firewall      = "tcp3389=$fwTcp udp3389=$fwUdp udp4433=$fw4433"
    services      = $svcTxt
    quic_udp4433  = 'dibuka di VM (tidak lewat tunnel TCP)'
    akses         = if ($addr) { $addr } else { '(menyusul)' }
    note          = if ($allOk) { 'Host siap dipakai klien XyDesk Remote mode Koneksi RDP (Host+Port tunnel)' }
                    else { 'Sebagian setelan host gagal — sesi tetap jalan lewat RDP biasa; cek log step Host setup XyDesk' }
} } | Out-Null

if ($allOk) {
  Log 'SELESAI — XyDesk host siap: AVC444 + ClearType + multi-session + audio/mic'
} else {
  Log "SELESAI (sebagian) — cek baris 'gagal' di atas; sesi tetap bisa dipakai lewat RDP biasa"
}
exit 0
