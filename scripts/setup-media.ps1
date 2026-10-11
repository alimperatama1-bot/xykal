# RdpFree wallpaper and real RDP audio-input redirection. Credit: KallAncrit.
$XyTag='RdpFree:media'
. "$PSScriptRoot/lib-common.ps1"
$ErrorActionPreference = 'Stop'
$root='C:\ProgramData\RdpFree'
New-Item -ItemType Directory -Path $root -Force | Out-Null
$mic=$env:MICROPHONE -ne 'tidak'
$wall=$true
$policy='Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
Set-Reg $policy 'fDisableAudio' 0 'DWord' | Out-Null
Set-Reg $policy 'fDisableAudioCapture' ([int](-not $mic)) 'DWord' | Out-Null
Set-Reg $policy 'fNoRemoteDesktopWallpaper' ([int](-not $wall)) 'DWord' | Out-Null
foreach ($service in @('AudioEndpointBuilder','Audiosrv')) {
  try { Set-Service $service -StartupType Automatic -ErrorAction Stop; Start-Service $service -ErrorAction Stop } catch { Log "Layanan $service belum aktif" }
}
if ($mic) { Set-Reg 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone' 'Value' 'Allow' 'String' | Out-Null }
$wallStatus='disabled'
if ($wall) {
  $target=Join-Path $root 'wallpaper.jpg'
  Copy-Item (Join-Path (Get-Workspace) 'assets\wallpaper.jpg') $target -Force
  $apply=Join-Path $root 'Apply-Desktop.ps1'
  $script=@'
$root='C:\ProgramData\RdpFree'
$image=Get-Content (Join-Path $root 'wallpaper-path.txt') -Raw
$image=$image.Trim()
if (-not (Test-Path $image)) { exit 1 }
$desk='HKCU:\Control Panel\Desktop'
Set-ItemProperty $desk -Name Wallpaper -Value $image
Set-ItemProperty $desk -Name WallpaperStyle -Value '10'
Set-ItemProperty $desk -Name TileWallpaper -Value '0'

Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class RdpFreeDesktop { [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern bool SystemParametersInfo(int a,int b,string c,int d); }'
[RdpFreeDesktop]::SystemParametersInfo(20,0,$image,3) | Out-Null
'@
  $script | Set-Content $apply -Encoding UTF8
  $target | Set-Content (Join-Path $root 'wallpaper-path.txt') -Encoding UTF8
  Set-RegBoth 'Control Panel\Desktop' 'Wallpaper' $target 'String' | Out-Null
  Set-RegBoth 'Control Panel\Desktop' 'WallpaperStyle' '10' 'String' | Out-Null
  Set-RegBoth 'Control Panel\Desktop' 'TileWallpaper' '0' 'String' | Out-Null
  $active='Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Active Setup\Installed Components\{86C45F69-A012-4D8E-BC70-4A3B4A597652}'
  Set-Reg $active 'Version' '3,0,0,0' 'String' | Out-Null
  Set-Reg $active 'StubPath' "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$apply`"" 'String' | Out-Null
  Set-RegBoth 'Software\Microsoft\Windows\CurrentVersion\Run' 'RdpFreeWallpaper' "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$apply`"" 'String' | Out-Null
  Close-DefaultHive
  if ((Get-ItemPropertyValue -Path $policy -Name 'fNoRemoteDesktopWallpaper') -ne 0) { throw 'Kebijakan Windows masih memblokir wallpaper Remote Desktop' }
  $wallStatus='xyverse_configured_for_user_logon'
}
Update-Status @{media=@{wallpaper=$wallStatus;microphone=$(if ($mic) {'rdp_capture_enabled'} else {'disabled'});audio_output='rdp_playback_enabled';verification='Login ulang, aktifkan mic di XyDesk dan izinkan Android. Uji Windows Settings > Sound > Input; kebijakan aktif bukan bukti capture end-to-end.'}} | Out-Null
Log 'Wallpaper profil dan audio capture disiapkan; pengujian suara tetap memerlukan klien tersambung.'
