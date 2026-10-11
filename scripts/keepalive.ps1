# RdpFree session lifetime uses the published expiry, not a fresh full duration after setup.
$XyTag='RdpFree:session'
. "$PSScriptRoot/lib-common.ps1"
$st=Read-Status
if (-not $st -or -not $st.expires_at) { throw 'Status sesi tidak memiliki expires_at' }
$stop=[DateTimeOffset]::Parse($st.expires_at).UtcDateTime.AddMinutes(-2)
$nextPublish=(Get-Date).ToUniversalTime().AddMinutes(5)
while ((Get-Date).ToUniversalTime() -lt $stop) {
  $left=$stop-(Get-Date).ToUniversalTime()
  Log "Sesi Tailscale berjalan; sisa $($left.ToString('hh\:mm'))"
  if ((Get-Date).ToUniversalTime() -ge $nextPublish) {
    Update-Status @{heartbeat_at=(Get-Date).ToUniversalTime().ToString('o')} | Out-Null
    & "$PSScriptRoot/publish-status.ps1" -Active $true
    $nextPublish=(Get-Date).ToUniversalTime().AddMinutes(5)
  }
  Start-Sleep -Seconds ([int][Math]::Max(1,[Math]::Min(60,$left.TotalSeconds)))
}
Log 'Durasi selesai; lanjut finalize.'
