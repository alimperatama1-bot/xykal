# ============================================================================
#  cleanup-actions.ps1 — bersih-bersih jejak Actions setelah sesi selesai:
#   1) hapus run LAMA dari workflow ini (termasuk log-nya) supaya repo rapi
#      dan IP/log sesi lama tidak mengendap. Simpan KEEP_RUNS run terbaru.
#   2) butuh token dengan scope repo: pakai secret CLEANUP_TOKEN (PAT), atau
#      GITHUB_TOKEN Actions (biasanya TIDAK cukup — cuma punya actions:read).
#
#  Env:
#    CLEANUP_TOKEN  — PAT scope repo (disarankan). Fallback: GITHUB_TOKEN.
#    KEEP_RUNS      — jumlah run terbaru yang dipertahankan (default 3).
# ============================================================================
$ErrorActionPreference = 'Continue'
function Log([string]$m) { Write-Host "[XyRDP:bersih] $m" }

$repo = $env:GITHUB_REPOSITORY
$wf   = $env:GH_WORKFLOW; if (-not $wf) { $wf = 'rdp-6h.yml' }
$keep = [int]($env:KEEP_RUNS -replace '\D',''); if ($keep -lt 1) { $keep = 3 }
$tok  = if ($env:CLEANUP_TOKEN) { $env:CLEANUP_TOKEN } else { $env:GITHUB_TOKEN }

if (-not $repo -or -not $tok) { Log 'repo/token tidak diketahui — skip'; exit 0 }

function GH([string]$method, [string]$apiPath) {
  $hdrs = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'XyRDP'; 'X-GitHub-Api-Version' = '2022-11-28' }
  try { return Invoke-RestMethod -Uri "https://api.github.com$apiPath" -Method $method -Headers $hdrs -TimeoutSec 30 }
  catch { Log "GH $method $apiPath -> $($_.Exception.Message)"; return $null }
}

Log "bersih-bersih run lama (simpan $keep terbaru)..."
try {
  $runs = GH 'GET' "/repos/$repo/actions/workflows/$wf/runs?per_page=100"
  $list = @($runs.workflow_runs)
  Log "  total run terlihat: $($list.Count)"
  if ($list.Count -le $keep) { Log '  tidak ada yang perlu dihapus'; exit 0 }
  $old = $list | Select-Object -Skip $keep
  $n = 0
  $hdrs = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'XyRDP'; 'X-GitHub-Api-Version' = '2022-11-28' }
  foreach ($r in $old) {
    # jangan hapus run yang sedang berjalan (termasuk diri sendiri)
    if ($r.status -eq 'in_progress' -or $r.status -eq 'queued') { continue }
    try {
      Invoke-RestMethod -Method Delete -Uri "https://api.github.com/repos/$repo/actions/runs/$($r.id)" -Headers $hdrs -TimeoutSec 30 | Out-Null
      $n++
      Log "  run #$($r.run_number) ($($r.id)) dihapus"
    } catch { Log "  hapus run #$($r.run_number) gagal: $($_.Exception.Message)" }
  }
  Log "  selesai: $n run lama dihapus"
} catch { Log "cleanup gagal (tidak kritis): $($_.Exception.Message)" }
exit 0
