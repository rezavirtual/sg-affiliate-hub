import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const HUB_DIR = 'C:\\AI\\SG-Affiliate-Hub';
const SITE_ID = '5b89bb53-4aed-49a6-bc2e-d49a43ae2806';
const TOKEN = 'process.env.NETLIFY_TOKEN || ""';

const zipPath = path.join(HUB_DIR, 'hub-dist.zip');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Create zip with powershell Compress-Archive
console.log('Packaging Hub into zip...');
execSync(`powershell -Command "Compress-Archive -Path '${HUB_DIR}\\index.html' -DestinationPath '${zipPath}' -Force"`);

console.log('Deploying to Netlify sg-affiliate-hub...');
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
    const data = JSON.parse(body);
    console.log('✔ Hub deployed successfully!');
    console.log('  Live URL:', data.url || 'https://sg-affiliate-hub.netlify.app/');
    console.log('  State:', data.state);
  });
});

req.write(zipBuffer);
req.end();
