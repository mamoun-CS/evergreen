import nextEnv from '@next/env';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
nextEnv.loadEnvConfig(process.cwd());
const [baselineRoot, finalRoot] = process.argv.slice(2);
if (!baselineRoot || !finalRoot) throw new Error('Provide isolated Phase 1 and Phase 2 production builds');
const require = createRequire(import.meta.url);
const routes = JSON.parse(readFileSync('artifacts/performance-phase2/http-measurements.json', 'utf8')).routes;
const dir = 'artifacts/performance-phase25';
mkdirSync(dir, { recursive: true });
const servers = [];
const results = {};
const comparePools = process.env.EVERGREEN_COMPARE_POOLS === '1';
const stats = values => {
  const sorted = [...values].sort((a,b) => a-b);
  return { n: sorted.length, median: (sorted[Math.floor((sorted.length-1)/2)] + sorted[Math.ceil((sorted.length-1)/2)]) / 2, p95: sorted[Math.ceil(sorted.length * .95)-1] };
};
try {
  for (const [index, [label, root]] of (comparePools ? [['pool3',finalRoot],['pool6',finalRoot]] : [['phase1', baselineRoot], ['phase2', finalRoot]]).entries()) {
    const port = 3196 + index;
    const events = [];
    let buffer = '';
    let log = '';
    const child = spawn(process.execPath, ['--require', path.resolve('scripts/phase25-prisma-probe.cjs'), require.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: root, env: { ...process.env, EVERGREEN_LOCAL_PERF_PROBE: '1', ...(comparePools ? {PRISMA_CONNECTION_LIMIT:index ? '6':'3'} : {}) }, stdio: ['ignore','pipe','pipe'], windowsHide: true });
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0,end); buffer = buffer.slice(end+1);
        if (line.startsWith('EVERGREEN_SQL ')) events.push(JSON.parse(line.slice(14)));
        else log += line + '\n';
      }
    });
    child.stderr.on('data', chunk => { log += chunk; });
    const server = { label, child, events, base: `http://127.0.0.1:${port}`, getLog: () => log };
    servers.push(server); results[label] = {};
    let ready = false;
    for (let i=0; i<80; i++) {
      try { const r = await fetch(`${server.base}/robots.txt`); await r.text(); ready = r.ok; } catch { /* startup */ }
      if (ready) break;
      if (child.exitCode !== null) throw new Error('Benchmark server exited');
      await new Promise(resolve => setTimeout(resolve,250));
    }
    if (!ready) throw new Error('Benchmark server startup timeout');
  }
  async function request(server, route, rsc = false) {
    const from = server.events.length;
    const started = performance.now();
    const response = await fetch(`${server.base}${route}`, { headers: { 'Accept-Encoding':'identity', ...(rsc ? { RSC:'1' } : {}) } });
    const headersMs = performance.now() - started;
    const text = await response.text();
    const completeMs = performance.now() - started;
    await new Promise(resolve => setImmediate(resolve));
    const sql = server.events.slice(from).filter(event => event.kind === 'SELECT');
    if (response.status !== 200) throw new Error(`HTTP ${response.status} for ${server.label}`);
    return { headersMs, completeMs, bytes: Buffer.byteLength(text), sqlSelects: sql.length, sqlDurationSumMs: sql.reduce((sum,e) => sum+e.durationMs,0), contentType: response.headers.get('content-type'), nextCacheHeader: response.headers.get('x-nextjs-cache') };
  }
  for (const [name, route] of Object.entries(routes)) {
    for (const server of servers) {
      results[server.label][name] = { firstProcessRequest: await request(server,route), warm: [], rsc: [] };
      for(let warmup=0;warmup<3;warmup++) await request(server,route);
    }
    // AB/BA alternating order controls for drift; no concurrent traffic.
    for (let sample=0;sample<30;sample++) {
      for (const server of sample % 2 ? [...servers].reverse() : servers) results[server.label][name].warm.push(await request(server,route));
    }
    for (let sample=0;sample<5;sample++) {
      for (const server of sample % 2 ? [...servers].reverse() : servers) results[server.label][name].rsc.push(await request(server,route,true));
    }
  }
  const summary = {};
  for (const [label, pages] of Object.entries(results)) {
    summary[label] = Object.fromEntries(Object.entries(pages).map(([name, value]) => [name, Object.fromEntries(['headersMs','completeMs','bytes','sqlSelects','sqlDurationSumMs'].map(key => [key,stats(value.warm.map(sample => sample[key]))]))]));
  }
  writeFileSync(`${dir}/${comparePools ? 'controlled-pools' : 'controlled-http'}.json`, JSON.stringify({ environment: { node: process.version, platform: process.platform, cpus: os.cpus().length, dataset: 2151 }, classification: 'First request per route in a new process; Data/DB/OS caches not cleared. 3 warmups, 30 AB/BA warm samples and 5 RSC samples per route/build. SQL sum includes parallel queries and cannot be subtracted as exact rendering time. Pool wait and network-only time unavailable.', routes, results, summary },null,2));
  console.log(JSON.stringify(summary,null,2));
} finally {
  for (const server of servers) {
    server.child.kill();
    if(server.child.exitCode===null) await new Promise(resolve => server.child.once('exit',resolve));
    writeFileSync(`${dir}/${server.label}-server.log`,server.getLog());
  }
}
