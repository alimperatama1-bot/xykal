# Official game preparation on a dedicated self-hosted Windows desktop only.
# No VM spoofing, anti-cheat bypass, copied commercial game or license bypass.
$XyTag='RdpFree:games'
. "$PSScriptRoot/lib-common.ps1"
$games=@{}
$hosted=$env:RDPFREE_RUNNER -ne 'self-hosted'
$os=Get-CimInstance Win32_OperatingSystem
$server=[int]$os.ProductType -ne 1
$cs=Get-CimInstance Win32_ComputerSystem
$dir='C:\Users\Public\Desktop\RdpFree Installers'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
function Prepare-Installer([string]$Url,[string]$Name,[string]$Publisher) {
  $file=Join-Path $dir $Name
  if (-not (Get-File $Url $file 120)) { return @{status='download_failed';note='Unduh ulang dari website resmi';path=''} }
  $sig=Get-AuthenticodeSignature $file
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch $Publisher) { Remove-Item $file -Force -ErrorAction SilentlyContinue;return @{status='signature_failed';note='Installer tidak dijalankan karena signature tidak valid';path=''} }
  return @{status='installer_ready';path=$file;note='Buka installer di sesi Windows, login dengan akun berlisensi, lalu uji game. Belum berarti game sudah berjalan.'}
}
foreach ($game in @('roblox','minecraft_java','minecraft_bedrock')) {
  $enabled=[Environment]::GetEnvironmentVariable($game.ToUpper()) -eq 'ya'
  if (-not $enabled) { $games[$game]=@{status='disabled';note='Tidak dipilih'};continue }
  if ($hosted) { $games[$game]=@{status='requires_self_hosted';note='Persiapan gaming hanya untuk mesin Windows self-hosted khusus milikmu.'};continue }
  switch ($game) {
    'roblox' {
      $games[$game]=Prepare-Installer 'https://setup.rbxcdn.com/RobloxPlayerInstaller.exe' 'RobloxPlayerInstaller.exe' 'Roblox'
      $games[$game].compatibility=$(if ($cs.HypervisorPresent) {'Hypervisor terdeteksi. Roblox dapat menolak lingkungan ini; tidak ada bypass.'} else {'Perlu uji DirectX/GPU dan login Roblox; tidak dijamin oleh installer.'})
    }
    'minecraft_java' {
      $games[$game]=Prepare-Installer 'https://launcher.mojang.com/download/MinecraftInstaller.msi' 'MinecraftInstaller.msi' 'Microsoft|Mojang'
      $games[$game].compatibility='Launcher resmi mengelola runtime Java. Akun berlisensi dan dukungan OpenGL/GPU tetap diperlukan.'
    }
    'minecraft_bedrock' {
      $store=Get-AppxPackage -AllUsers -Name Microsoft.WindowsStore -ErrorAction SilentlyContinue
      if ($server -or -not $store) { $games[$game]=@{status='unsupported_environment';note='Bedrock membutuhkan Windows desktop dengan Microsoft Store/Xbox. Windows Server bukan target yang didukung setup ini.'} }
      else {
        "[InternetShortcut]`r`nURL=https://www.minecraft.net/download" | Set-Content (Join-Path $dir 'Minecraft Bedrock.url')
        $games[$game]=@{status='store_required';note='Buka tautan Minecraft resmi, pasang melalui Store, lalu login akun yang memiliki lisensi. Tidak dipasang atau diuji otomatis.'}
      }
    }
  }
}
$st=Read-Status
if ($env:SAMP -eq 'ya' -and $hosted) { $games.samp=@{status='requires_self_hosted';note='Pemasangan game hanya di mesin self-hosted khusus.'} }
elseif ($st.samp) { $games.samp=@{status=$st.samp.status;note=$st.samp.note;game_dir=$st.samp.game_dir;gta_installed=$st.samp.gta_installed;samp_installed=$st.samp.samp_installed} }
else { $games.samp=@{status='disabled';note='Tidak dipilih'} }
Update-Status @{games=$games;game_environment=@{os=$os.Caption;windows_server=$server;hypervisor_present=[bool]$cs.HypervisorPresent;runner=$env:RDPFREE_RUNNER;play_tested=$false}} | Out-Null
Log 'Status persiapan game ditulis. Tidak mengklaim permainan sudah berhasil dijalankan.'
