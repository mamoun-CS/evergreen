// Compare actual Next image optimizer output from an isolated, prebuilt app.
// No source images are modified. Run: node scripts/phase4-image-quality.cjs <build-root>
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = process.argv[2];
if (!root) throw Error('Provide an isolated production build root');
require('@next/env').loadEnvConfig(process.cwd());
const out = 'artifacts/performance-phase4/image-quality';
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:3198';
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3198', '-H', '127.0.0.1'], { cwd: root, env: process.env, stdio: 'ignore', windowsHide: true });
const sources = ['100_1.png', '1057_1.jpg', '1062_1.jpg', '1067_1.jpg', '3294_1.png', '3294_5.png'];
const result = { note: 'Next optimizer, same 750px candidate and AVIF Accept header, no modifications to source images; pixel errors compare decoded q75/q80 to decoded q90.', samples: [] };
(async () => {
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) { try { ready = (await fetch(base + '/robots.txt')).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 250)); }
    if (!ready) throw Error('Server not ready');
    for (const source of sources) {
      const images = {};
      for (const quality of [90, 80, 75]) {
        const url = new URL('/_next/image', base);
        url.search = new URLSearchParams({ url: '/products/' + source, w: '750', q: String(quality) }).toString();
        const response = await fetch(url, { headers: { accept: 'image/avif,image/webp,image/*' } });
        if (!response.ok) throw Error(`${source}: image HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(path.join(out, `${source}-q${quality}.avif`), bytes);
        const raw = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        images[quality] = { bytes: bytes.length, contentType: response.headers.get('content-type'), raw };
      }
      const reference = images[90].raw;
      const results = {};
      for (const quality of [75, 80, 90]) {
        const image = images[quality];
        let sum = 0;
        if (image.raw.data.length !== reference.data.length) throw Error('Different image dimensions');
        for (let i = 0; i < reference.data.length; i++) sum += Math.abs(reference.data[i] - image.raw.data[i]);
        results[quality] = { bytes: image.bytes, contentType: image.contentType, meanAbsoluteChannelDifferenceVs90: sum / reference.data.length };
      }
      result.samples.push({ source, width: reference.info.width, height: reference.info.height, results });
      console.log(source, JSON.stringify(results));
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
  } finally {
    server.kill();
    if (server.exitCode === null) await new Promise(r => server.once('exit', r));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
