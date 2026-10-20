<#
  OCR de páginas de PDF con las herramientas que trae Windows (Windows.Data.Pdf + Windows.Media.Ocr, español).
  No requiere instalar nada. Para etiquetas escaneadas (páginas sin texto).

  Uso (Windows PowerShell 5.1):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\fase2\ocr_windows.ps1 `
      -Pdf <archivo.pdf> -Paginas 1,2 -Salida <salida.json> [-CarpetaImagenes <carpeta>]

  Salida: JSON con, por página, las líneas leídas y su posición (x, y, ancho, alto en píxeles).
  Si se indica -CarpetaImagenes, guarda también la imagen de cada página (<id>_p<N>.png) para revisar a ojo.
#>
param(
  [Parameter(Mandatory = $true)][string]$Pdf,
  [Parameter(Mandatory = $true)][int[]]$Paginas,
  [Parameter(Mandatory = $true)][string]$Salida,
  [string]$CarpetaImagenes = '',
  [double]$Dpi = 300
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$metodos = [System.WindowsRuntimeSystemExtensions].GetMethods()
$comoTareaGen = $metodos | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$comoTareaAcc = $metodos | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1

function Esperar($operacion, [Type]$tipo) {
  $tarea = $comoTareaGen.MakeGenericMethod($tipo).Invoke($null, @($operacion))
  $tarea.Wait(-1) | Out-Null
  return $tarea.Result
}
function EsperarAccion($accion) {
  $tarea = $comoTareaAcc.Invoke($null, @($accion))
  $tarea.Wait(-1) | Out-Null
}

$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('es-MX'))
if ($null -eq $motor) { throw 'No hay OCR en español en este Windows.' }
$maximo = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension - 50

$archivo = Esperar ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Pdf).Path)) ([Windows.Storage.StorageFile])
$documento = Esperar ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($archivo)) ([Windows.Data.Pdf.PdfDocument])
$id = [System.IO.Path]::GetFileNameWithoutExtension($Pdf)

$resultado = @()
foreach ($n in $Paginas) {
  if ($n -lt 1 -or $n -gt $documento.PageCount) { continue }
  $pagina = $documento.GetPage([uint32]($n - 1))
  # Size viene en DIP (1/96 de pulgada). Escala para ~$Dpi sin pasar el máximo del OCR.
  $escala = [Math]::Min($Dpi / 96.0, [Math]::Min($maximo / $pagina.Size.Width, $maximo / $pagina.Size.Height))
  $opciones = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opciones.DestinationWidth = [uint32][Math]::Floor($pagina.Size.Width * $escala)
  $opciones.DestinationHeight = [uint32][Math]::Floor($pagina.Size.Height * $escala)
  $flujo = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  EsperarAccion ($pagina.RenderToStreamAsync($flujo, $opciones))
  if ($CarpetaImagenes) {
    $null = New-Item -ItemType Directory -Force $CarpetaImagenes
    $lector = New-Object Windows.Storage.Streams.DataReader($flujo.GetInputStreamAt(0))
    $null = Esperar ($lector.LoadAsync([uint32]$flujo.Size)) ([uint32])
    $bytes = New-Object byte[] ($flujo.Size)
    $lector.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes((Join-Path $CarpetaImagenes ("{0}_p{1}.png" -f $id, $n)), $bytes)
  }
  $flujo.Seek(0)
  $decodificador = Esperar ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($flujo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $mapa = Esperar ($decodificador.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = Esperar ($motor.RecognizeAsync($mapa)) ([Windows.Media.Ocr.OcrResult])
  $lineas = @()
  foreach ($l in $ocr.Lines) {
    $x1 = ($l.Words | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
    $y1 = ($l.Words | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
    $x2 = ($l.Words | ForEach-Object { $_.BoundingRect.X + $_.BoundingRect.Width } | Measure-Object -Maximum).Maximum
    $y2 = ($l.Words | ForEach-Object { $_.BoundingRect.Y + $_.BoundingRect.Height } | Measure-Object -Maximum).Maximum
    $lineas += [pscustomobject]@{ texto = $l.Text; x = [int]$x1; y = [int]$y1; ancho = [int]($x2 - $x1); alto = [int]($y2 - $y1) }
  }
  $resultado += [pscustomobject]@{ pagina = $n; ancho = $opciones.DestinationWidth; alto = $opciones.DestinationHeight; lineas = $lineas }
  $mapa.Dispose(); $flujo.Dispose()
}
$json = ConvertTo-Json -InputObject @($resultado) -Depth 6
[System.IO.File]::WriteAllText($Salida, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("{0}: {1} página(s) leídas" -f $id, $resultado.Count)
