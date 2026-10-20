<#
  Recorta una zona de una imagen (para revisar a ojo un texto leído con OCR).
  Uso: powershell -NoProfile -File scripts\fase2\recortar.ps1 -Imagen in.png -X 0 -Y 0 -Ancho 800 -Alto 400 -Salida out.png [-Escala 1.0]
#>
param(
  [Parameter(Mandatory = $true)][string]$Imagen,
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [Parameter(Mandatory = $true)][int]$Ancho,
  [Parameter(Mandatory = $true)][int]$Alto,
  [Parameter(Mandatory = $true)][string]$Salida,
  [double]$Escala = 1.0
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$origen = [System.Drawing.Image]::FromFile((Resolve-Path $Imagen).Path)
try {
  $x = [Math]::Max(0, $X); $y = [Math]::Max(0, $Y)
  $w = [Math]::Min($Ancho, $origen.Width - $x); $h = [Math]::Min($Alto, $origen.Height - $y)
  $dw = [int]($w * $Escala); $dh = [int]($h * $Escala)
  $destino = New-Object System.Drawing.Bitmap($dw, $dh)
  $g = [System.Drawing.Graphics]::FromImage($destino)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($origen, (New-Object System.Drawing.Rectangle(0, 0, $dw, $dh)), (New-Object System.Drawing.Rectangle($x, $y, $w, $h)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $destino.Save($Salida, [System.Drawing.Imaging.ImageFormat]::Png)
  $destino.Dispose()
} finally { $origen.Dispose() }
Write-Output "ok $Salida ($dw x $dh)"
