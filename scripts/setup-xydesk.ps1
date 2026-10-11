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

# ---------- 0. Probe awal (RDP sehat?) ----------
$rdpAlive0 = Probe-Rdp 'sebelum tweak xydesk'

# ---------- 1. Multi-sesi: kunci root + kunci KEBIJAKAN saja ----------
# PENTING (temuan validasi 2026-10-03): menulis nilai di
#   HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
# memaksa TermService membangun ulang listener RDP, dan di runner GitHub
# listener 3389 tidak kembali sehat (probe: awal=True -> reg=False, tunnel mati).
# Jadi kunci itu sekarang hanya DIBACA (audit), tidak ditulis.
$okDeny  = Set-Reg $tsRoot 'fDenyTSConnections'   0 'DWord'
$okMulti = Set-Reg $tsRoot 'fSingleSessionPerUser' 0 'DWord'
Set-Reg $tsPol 'fDenyTSConnections'   0 'DWord' | Out-Null
Set-Reg $tsPol 'fSingleSessionPerUser' 0 'DWord' | Out-Null
Log "  RDP: denyTS=$okDeny multisesi=$okMulti"
$rdpAlive1 = Probe-Rdp 'setelah setelan multi-sesi (root+policy)'

# ---------- 1b. Audio + font: kebijakan + audit kunci WinStation (tanpa tulis) ----------
Set-Reg $tsPol 'fDisableAudioCapture' 0 'DWord' | Out-Null
$curAudio = Get-Reg $tsTcp 'fDisableAudio'
$curMic   = Get-Reg $tsTcp 'fDisableAudioCapture'
$curFs    = Get-Reg $tsTcp 'fNoFontSmoothing'
$curAa    = Get-Reg $tsTcp 'AllowFontAntiAlias'
Log "  audit WinStations\RDP-Tcp (tanpa tulis): fDisableAudio=$curAudio fDisableAudioCapture=$curMic fNoFontSmoothing=$curFs AllowFontAntiAlias=$curAa"
# audio out/mic dianggap aktif kalau nilainya bukan 1 (null = default Windows)
$okAudio = ("$curAudio" -ne '1')
$okMic   = ("$curMic"   -ne '1')
$rdpAlive2 = Probe-Rdp 'setelah kebijakan audio + audit WinStation'

# ---------- 2. Kebijakan grafis XyDesk (AVC444 / hardware encode) ----------
$okAvc  = Set-Reg $tsPol 'AVC444ModePreferred'       1 'DWord'
$okAvc2 = Set-Reg $tsPol 'AVCHardwareEncodePreferred' 1 'DWord'
Set-Reg $tsPol 'VGAdapter'            1 'DWord' | Out-Null
Set-Reg $tsPol 'bEnumerateHWBeforeSW' 1 'DWord' | Out-Null
Set-Reg $tsPol 'SelectTransport'      0 'DWord' | Out-Null
Set-Reg $tsPol 'fAllowDesktopComposition' 1 'DWord' | Out-Null
$avcTxt = if ($okAvc -and $okAvc2) { 'ok' } else { 'gagal' }
Log "  grafis: AVC444ModePreferred+AVCHardwareEncodePreferred -> $avcTxt"
$rdpAlive3 = Probe-Rdp 'setelah kebijakan grafis (AVC444)'

# ---------- 3. ClearType: lewat profil Default (per-user), bukan kunci WinStation ----------
$fontTxt = 'gagal'
if (Open-DefaultHive) {
  $dp = "$($script:DefReg)\Control Panel\Desktop"
  $f1 = Set-Reg $dp 'FontSmoothing'      '2' 'String'
  $f2 = Set-Reg $dp 'FontSmoothingType'   2  'DWord'
  Set-Reg $dp 'FontSmoothingGamma'      1400 'DWord' | Out-Null
  Set-Reg $dp 'FontSmoothingOrientation'  1  'DWord' | Out-Null
  Close-DefaultHive
  $fontTxt = if ($f1 -and $f2) { 'ok (ClearType profil Default)' } elseif ($f1 -or $f2) { 'sebagian' } else { 'gagal' }
} else { $fontTxt = 'gagal (profil Default tak bisa di-load)' }
Log "  ClearType: $fontTxt (FontSmoothing=2 + FontSmoothingType=2 di profil Default)"
$rdpAlive4 = Probe-Rdp 'setelah ClearType profil Default'

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
$rdpAlive5 = Probe-Rdp 'setelah aturan firewall'

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
$rdpAlive6 = Probe-Rdp 'setelah start layanan'

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

# ---------- 6b. Verifikasi RDP masih hidup setelah tweak ----------
# CATATAN PENTING (validasi 2026-10-03): setelah tweak, listener 3389 di runner
# ini sempat mati ~2 menit. Kita TIDAK me-restart TermService lagi (restart tidak
# membantu, malah memperlama mati) — kita cukup mengukur dan melaporkan apa
# adanya supaya setup-akses tahu harus menunggu berapa lama.
$rdpReadyAt = Wait-RdpReady -TimeoutSec 150
if ($rdpReadyAt) { Log "  RDP masih sehat setelah tweak: $rdpReadyAt`:3389 (handshake X.224 OK)" }
else { Log '  PERINGATAN: RDP belum menjawab handshake setelah tweak — setup-akses akan menunggu lagi' }

# ---------- 7. Status (apa adanya, bukan asumsi) ----------
$allOk = $okDeny -and $okMulti -and $okAudio -and $okMic -and $okAvc -and $okAvc2 -and ($fontTxt -like 'ok*')
Update-Status @{ xydesk = [ordered]@{
    host          = if ($allOk) { 'ok' } else { 'sebagian' }
    denyts        = if ($okDeny) { 'ok' } else { 'gagal' }
    multisession  = if ($okMulti) { 'ok' } else { 'gagal' }
    avc444        = $avcTxt
    fontsmoothing = $fontTxt
    audio_out     = if ($okAudio) { "ok (fDisableAudio=$curAudio)" } else { "gagal (fDisableAudio=$curAudio di image)" }
    audio_mic     = if ($okMic) { "ok (fDisableAudioCapture=$curMic)" } else { "gagal (fDisableAudioCapture=$curMic di image)" }
    firewall      = "tcp3389=$fwTcp udp3389=$fwUdp udp4433=$fw4433"
    services      = $svcTxt
    rdp_ready     = if ($rdpReadyAt) { "$rdpReadyAt (handshake OK)" } else { 'belum' }
    rdp_probe     = "awal=$rdpAlive0 multi=$rdpAlive1 audio=$rdpAlive2 grafis=$rdpAlive3 clear=$rdpAlive4 fw=$rdpAlive5 svc=$rdpAlive6"
    quic_udp4433  = 'dibuka di VM (tidak lewat tunnel TCP)'
    akses         = if ($addr) { $addr } else { '(menyusul)' }
    note          = if ($allOk) { 'Host siap dipakai klien XyDesk Remote mode Koneksi RDP (Host+Port tunnel). Kunci WinStations\RDP-Tcp sengaja TIDAK ditulis supaya listener 3389 tidak mati di runner GitHub.' }
                    else { 'Sebagian setelan host gagal — sesi tetap jalan lewat RDP biasa; cek log step Host setup XyDesk' }
} } | Out-Null

if ($allOk) {
  Log 'SELESAI — XyDesk host siap: AVC444 + ClearType + multi-session + audio/mic'
} else {
  Log "SELESAI (sebagian) — cek baris 'gagal' di atas; sesi tetap bisa dipakai lewat RDP biasa"
}
exit 0
