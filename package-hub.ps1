Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ErrorActionPreference = 'Stop'
$rootDir = $PSScriptRoot
$distDir = Join-Path $rootDir 'dist'
$zipPath = Join-Path $rootDir 'hub-dist.zip'

if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

Copy-Item -Path (Join-Path $rootDir 'index.html') -Destination (Join-Path $distDir 'index.html') -Force
Copy-Item -Path (Join-Path $rootDir '_headers') -Destination (Join-Path $distDir '_headers') -Force
Copy-Item -Path (Join-Path $rootDir 'netlify.toml') -Destination (Join-Path $distDir 'netlify.toml') -Force
Copy-Item -Path (Join-Path $rootDir '_redirects') -Destination (Join-Path $distDir '_redirects') -Force

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$files = Get-ChildItem -Path $distDir -Recurse -File
foreach ($file in $files) {
    $relative = $file.FullName.Substring($distDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    Write-Host "Added entry: $relative"
}

$zip.Dispose()
Write-Host "SUCCESS: hub-dist.zip created"
