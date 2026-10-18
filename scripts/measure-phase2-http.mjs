import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { openSync, closeSync, writeFileSync } from 'node:fs';
import path from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const [baselineRoot, finalRoot] = process.argv.slice(2);
if (!baselineRoot || !finalRoot) throw new Error('Supply two isolated, already built application directories.');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Local development database only.');
url.searchParams.set('connection_limit', '1');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let routes;
try {
  const [product, category] = await Promise.all([
    db.product.findFirst({ where: { isAvailable: true }, select: { slug: true }, orderBy: { id: 'asc' } }),
    db.category.findFirst({ where: { products: { some: { isAvailable: true } } }, select: { slug: true }, orderBy: { id: 'asc' } }),
  ]);
  if (!product || !category) throw new Error('Representative development fixtures are required.');
  routes = { home: '/', shop: '/shop', category: `/category/${encodeURIComponent(category.slug)}`, product: `/products/${encodeURIComponent(product.slug)}` };
} finally { await db.$disconnect(); }

const require = createRequire(import.meta.url);
const output = { note: 'Local production-mode HTTP, no browser JS or API writes. Sequential baseline then final; build Data Caches may already be warm. Cold means first request to this server process, not an empty database/OS cache. Not a controlled production speedup.', routes, measurements: {} };
for (const [index, [label, root]] of [['baseline', baselineRoot], ['final', finalRoot]].entries()) {
  const port = 3186 + index;
  const fd = openSync(path.resolve(`artifacts/performance-phase2/${label}-server.log`), 'w');
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: root, env: process.env, stdio: ['ignore', fd, fd], windowsHide: true });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`${label} server exited before readiness`);
      try { const response = await fetch(`${base}/robots.txt`); await response.text(); ready = response.ok; } catch { /* startup */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error(`${label} server readiness timed out`);
    output.measurements[label] = {};
    for (const [name, route] of Object.entries(routes)) {
      const samples = [];
      for (let run = 0; run < 3; run++) {
        const started = performance.now();
        const response = await fetch(`${base}${route}`, { headers: { 'Accept-Encoding': 'identity' } });
        const headersMs = performance.now() - started;
        const html = await response.text();
        samples.push({ run, status: response.status, headersMs, completeMs: performance.now() - started, uncompressedBytes: Buffer.byteLength(html), containsProductLinks: html.includes('/products/'), cacheControl: response.headers.get('cache-control') });
        if (!response.ok) throw new Error(`${label} ${name} returned ${response.status}`);
      }
      output.measurements[label][name] = samples;
    }
  } finally {
    server.kill();
    if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve));
    closeSync(fd);
  }
}
writeFileSync('artifacts/performance-phase2/http-measurements.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output.measurements, null, 2));
