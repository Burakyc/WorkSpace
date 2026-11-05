# Draws the placeholder app icon: a 256x256 indigo rounded square with white "DP".
# Run from anywhere: powershell -File apps/desktop/build/make-icon.ps1
# electron-builder turns build/icon.png into the Windows .ico.
Add-Type -AssemblyName System.Drawing

$size = 256
$radius = 56
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::Transparent)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = $radius * 2
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($size - $d - 1, 0, $d, $d, 270, 90)
$path.AddArc($size - $d - 1, $size - $d - 1, $d, $d, 0, 90)
$path.AddArc(0, $size - $d - 1, $d, $d, 90, 90)
$path.CloseFigure()
$indigo = [System.Drawing.Color]::FromArgb(255, 0x4f, 0x46, 0xe5)
$graphics.FillPath((New-Object System.Drawing.SolidBrush $indigo), $path)

$font = New-Object System.Drawing.Font 'Segoe UI', 104, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$area = New-Object System.Drawing.RectangleF 0, 4, $size, $size
$graphics.DrawString('DP', $font, [System.Drawing.Brushes]::White, $area, $format)

$out = Join-Path $PSScriptRoot 'icon.png'
$bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
"Saved $out"
