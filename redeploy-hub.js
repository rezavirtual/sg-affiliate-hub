import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const HUB_DIR = 'C:\\AI\\SG-Affiliate-Hub';
const DIST_DIR = path.join(HUB_DIR, 'dist');
const SITE_ID = '5b89bb53-4aed-49a6-bc2e-d49a43ae2806';
const TOKEN = 'REDACTED_NETLIFY_TOKEN';

// 1. Prepare dist folder
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Copy essential files to dist
fs.copyFileSync(path.join(HUB_DIR, 'index.html'), path.join(DIST_DIR, 'index.html'));
fs.copyFileSync(path.join(HUB_DIR, '_headers'), path.join(DIST_DIR, '_headers'));
fs.copyFileSync(path.join(HUB_DIR, 'netlify.toml'), path.join(DIST_DIR, 'netlify.toml'));
fs.copyFileSync(path.join(HUB_DIR, '_redirects'), path.join(DIST_DIR, '_redirects'));

// 2. Package dist with POSIX forward slashes
const zipPath = path.join(HUB_DIR, 'hub-dist.zip');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

console.log('📦 Packaging dist/ into hub-dist.zip with POSIX forward slashes...');
const psScript = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open('${zipPath.replace(/\\/g, '\\\\')}', [System.IO.Compression.ZipArchiveMode]::Create)
$files = Get-ChildItem -Path '${DIST_DIR.replace(/\\/g, '\\\\')}' -Recurse -File
foreach ($file in $files) {
    $relative = $file.FullName.Substring('${DIST_DIR.replace(/\\/g, '\\\\')}'.Length + 1).Replace('\\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$zip.Dispose()
`;

execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);
console.log('✔ Zip created successfully.');

// Inspect zip entries
const inspectScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}')
$z.Entries | ForEach-Object { $_.FullName }
$z.Dispose()
`;
const entries = execSync(`powershell -NoProfile -Command "${inspectScript.replace(/\n/g, ' ')}"`).toString().trim();
console.log('Zip entries:\n' + entries);

// 3. Deploy to Netlify
console.log('🚀 Deploying to Netlify sg-affiliate-hub...');
const zipBuffer = fs.readFileSync(zipPath);

const req = https.request({
  hostname: 'api.netlify.com',
  path: `/api/v1/sites/${SITE_ID}/deploys`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/zip',
    'Content-Length': zipBuffer.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('✔ Netlify deploy response code:', res.statusCode);
      console.log('  State:', data.state);
      console.log('  Deploy ID:', data.id);
      console.log('  URL:', data.ssl_url || data.url);
    } catch (e) {
      console.log('Response:', res.statusCode, body);
    }
  });
});

req.on('error', err => console.error('Error:', err));
req.write(zipBuffer);
req.end();
