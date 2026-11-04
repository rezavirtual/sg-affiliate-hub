import fs from 'fs';
import path from 'path';
import https from 'https';

const HUB_DIR = 'C:\\AI\\SG-Affiliate-Hub';
const SITE_ID = '5b89bb53-4aed-49a6-bc2e-d49a43ae2806';
const TOKEN = 'REDACTED_NETLIFY_TOKEN';
const zipPath = path.join(HUB_DIR, 'hub-dist.zip');

if (!fs.existsSync(zipPath)) {
  console.error('hub-dist.zip does not exist!');
  process.exit(1);
}

const zipBuffer = fs.readFileSync(zipPath);
console.log(`Uploading ${zipBuffer.length} bytes to Netlify site ${SITE_ID}...`);

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
      console.log('HTTP Status:', res.statusCode);
      console.log('Deploy State:', data.state);
      console.log('Deploy ID:', data.id);
      console.log('Site URL:', data.ssl_url || data.url);
    } catch (e) {
      console.log('Response:', res.statusCode, body);
    }
  });
});

req.on('error', err => console.error('Upload Error:', err));
req.write(zipBuffer);
req.end();
