# Compila, firma e instala Pulse TV en un televisor Samsung.
#
# Por qué existe: `tizen install`, el comando estándar, **no funciona** en las TV
# de Samsung. Falla en un segundo con «Failed to install Tizen application» y sin
# dejar nada en el log del televisor, así que parece un problema de certificado
# y no lo es. Samsung usa su propio instalador, `vd_appinstall`, y ese sí acepta
# un certificado autofirmado.
#
# Uso:
#   .\scripts\install-tv.ps1 -Ip 192.168.100.11
#
# Requisitos, una sola vez:
#   - Televisor en modo desarrollador con la IP de este PC
#   - Un perfil de firma:
#       tizen certificate -a Pulse -f pulse -p <contraseña>
#       tizen security-profiles add -n pulse -a <ruta>\keystore\author\pulse.p12 -p <contraseña>

param(
  [Parameter(Mandatory = $true)][string]$Ip,
  [string]$Perfil = 'pulse',
  [string]$TizenStudio = 'C:\tizen-studio'
)

$ErrorActionPreference = 'Stop'

$sdb   = Join-Path $TizenStudio 'tools\sdb.exe'
$tizen = Join-Path $TizenStudio 'tools\ide\bin\tizen.bat'
$raiz  = Split-Path $PSScriptRoot -Parent
$wgt   = Join-Path $raiz 'tizen-build\Pulse TV.wgt'

# Debe coincidir con `tizen:application id` de tizen/config.xml.
$appId   = 'PulseMusic.PulseTV'
$destino = '/home/owner/share/tmp/sdk_tools/tmp/PulseTV.wgt'

Write-Host '1/5  Compilando y armando el paquete…' -ForegroundColor Cyan
npm.cmd run tizen | Out-Null

Write-Host '2/5  Firmando…' -ForegroundColor Cyan
& $tizen package -t wgt -s $Perfil -- (Join-Path $raiz 'tizen-build') | Out-Null
if (-not (Test-Path $wgt)) { throw "No se generó el .wgt. Revisa el perfil de firma '$Perfil'." }
Write-Host "     $([Math]::Round((Get-Item $wgt).Length / 1KB)) KB"

Write-Host '3/5  Conectando con el televisor…' -ForegroundColor Cyan
& $sdb connect "${Ip}:26101" | Out-Null
$dev = "${Ip}:26101"

Write-Host '4/5  Enviando…' -ForegroundColor Cyan
& $sdb -s $dev push $wgt $destino | Out-Null

Write-Host '5/5  Instalando y lanzando…' -ForegroundColor Cyan
& $sdb -s $dev shell "0 vd_appinstall $appId $destino"
& $sdb -s $dev shell "0 was_execute $appId"

Write-Host ''
Write-Host 'Listo. Mira el televisor.' -ForegroundColor Green
