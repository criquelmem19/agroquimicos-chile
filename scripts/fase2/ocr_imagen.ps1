<#
  OCR (Windows, español) de una imagen PNG/JPG. Útil cuando la capa de texto del PDF viene dañada:
  se renderiza la página con render_pagina.py y se lee aquí.
  Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\fase2\ocr_imagen.ps1 -Imagen pagina.png -Salida pagina.json
#>
param(
  [Parameter(Mandatory = $true)][string]$Imagen,
  [Parameter(Mandatory = $true)][string]$Salida
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$comoTarea = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Esperar($op, [Type]$tipo) { $t = $comoTarea.MakeGenericMethod($tipo).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }

$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('es-MX'))
$archivo = Esperar ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Imagen).Path)) ([Windows.Storage.StorageFile])
$flujo = Esperar ($archivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decodificador = Esperar ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($flujo)) ([Windows.Graphics.Imaging.BitmapDecoder])
$mapa = Esperar ($decodificador.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$ocr = Esperar ($motor.RecognizeAsync($mapa)) ([Windows.Media.Ocr.OcrResult])
$lineas = @($ocr.Lines | ForEach-Object { $_.Text })
$json = ConvertTo-Json -InputObject @{ lineas = $lineas } -Depth 3
[System.IO.File]::WriteAllText($Salida, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("{0} líneas" -f $lineas.Count)
