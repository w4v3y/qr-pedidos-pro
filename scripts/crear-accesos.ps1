# Crea los accesos directos del sistema en el Escritorio del usuario.
$ErrorActionPreference = 'Stop'
$codigo    = Split-Path -Parent $PSScriptRoot
$escritorio = [Environment]::GetFolderPath('Desktop')
$shell     = New-Object -ComObject WScript.Shell

function Nuevo-AccesoPrograma($nombre, $destino, $icono, $indiceIcono) {
    $ruta = Join-Path $escritorio "$nombre.lnk"
    if (Test-Path $ruta) { Remove-Item $ruta -Force }
    $lnk = $shell.CreateShortcut($ruta)
    $lnk.TargetPath       = $destino
    $lnk.WorkingDirectory = $codigo
    $lnk.IconLocation     = "$icono,$indiceIcono"
    $lnk.Description      = "QR Pedidos PRO - $nombre"
    $lnk.Save()
    Write-Host "  OK  $nombre"
}
function Nuevo-AccesoWeb($nombre, $url, $icono, $indiceIcono) {
    $ruta = Join-Path $escritorio "$nombre.url"
    if (Test-Path $ruta) { Remove-Item $ruta -Force }
    @"
[InternetShortcut]
URL=$url
IconFile=$icono
IconIndex=$indiceIcono
"@ | Set-Content -Path $ruta -Encoding ASCII
    Write-Host "  OK  $nombre"
}

$imageres = "$env:SystemRoot\System32\imageres.dll"
$shell32  = "$env:SystemRoot\System32\shell32.dll"

Nuevo-AccesoPrograma "1. Iniciar Restaurante"   (Join-Path $codigo 'INICIAR.bat') $imageres 76
Nuevo-AccesoWeb      "2. Panel de Administracion" 'http://localhost:3000/admin'   $imageres 109
Nuevo-AccesoWeb      "3. Pantalla de Cocina"      'http://localhost:3000/cocina'  $imageres 78
Nuevo-AccesoWeb      "4. Alertas del Mozo"        'http://localhost:3000/mozo'    $imageres 79
Nuevo-AccesoWeb      "5. Imprimir codigos QR"     'http://localhost:3000/qr'      $imageres 152
Nuevo-AccesoPrograma "6. Activar Internet"       (Join-Path $codigo 'TUNEL.bat')  $imageres 143
Nuevo-AccesoPrograma "7. Probar sistema"         (Join-Path $codigo 'PROBAR.bat') $imageres 101
Nuevo-AccesoPrograma "8. Codigo fuente"           $codigo                          $shell32   4

Write-Host ""
Write-Host "Listo. Los 8 accesos estan en tu Escritorio, junto a la carpeta del codigo."
