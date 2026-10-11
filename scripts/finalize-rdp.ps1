# ============================================================================
#  finalize-rdp.ps1 — dijalankan setelah sesi berakhir (selalu, apa pun hasil):
#    1) matikan jalur akses: service RustDesk + proses tunnel (bore/ngrok)
#    2) hapus file kredensial RustDesk lokal (VM toh dihancurkan, ini
#       sekadar kebersihan: tidak ada sisa password di disk yang tersisa)
#    3) tidak ada lagi yang perlu dihapus di sisi luar (tanpa Tailscale,
#       tanpa self-hosted server — tidak ada node/akun yang nyangkut)
# ============================================================================

$XyTag = 'XyRDP:fin'
. "$PSScriptRoot/lib-common.ps1"

# ---------- 1. RustDesk ----------
try {
  $rd = Get-Process -Name 'rustdesk' -ErrorAction SilentlyContinue
  if ($rd) { $rd | Stop-Process -Force -ErrorAction SilentlyContinue; Log "proses RustDesk dihentikan ($(@($rd).Count) proses)" }
  $svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq 'Running') {
    Stop-Service -Name 'RustDesk' -Force -ErrorAction SilentlyContinue
    Log 'service RustDesk dihentikan'
  }
} catch { Log "matikan RustDesk (tidak kritis): $($_.Exception.Message)" }

# ---------- 2. Tunnel ----------
$killed = 0
foreach ($name in @('bore', 'ngrok')) {
  $ps = Get-Process -Name $name -ErrorAction SilentlyContinue
  if ($ps) { $ps | Stop-Process -Force -ErrorAction SilentlyContinue; $killed += @($ps).Count; Log "proses $name dihentikan ($(@($ps).Count))" }
}
if ($killed -eq 0) { Log 'tidak ada proses tunnel yang berjalan' }

# ---------- 2b. Tailscale: turunkan + logout supaya node tidak menumpuk ----------
foreach ($p in @("$env:ProgramFiles\Tailscale\tailscale.exe", "${env:ProgramFiles(x86)}\Tailscale\tailscale.exe")) {
  if (Test-Path $p) {
    try { & $p down 2>&1 | Out-Null; Log 'tailscale: down (node dinonaktifkan)' } catch {}
    try { & $p logout 2>&1 | Out-Null; Log 'tailscale: logout (node dilepas dari tailnet)' } catch {}
    break
  }
}

# ---------- 3. Bersihkan sisa kredensial lokal (opsional/kebersihan) ----------
try {
  $rdCfg = Join-Path $env:APPDATA 'RustDesk\config\RustDesk2.toml'
  if (Test-Path $rdCfg) { Remove-Item $rdCfg -Force -ErrorAction SilentlyContinue; Log 'config RustDesk lokal dihapus' }
} catch {}

Log 'selesai. VM akan dihancurkan GitHub setelah job ini berakhir — tidak ada node/akun yang perlu dibersihkan.'
exit 0
