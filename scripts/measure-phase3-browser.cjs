// Local diagnostic only: pass a prebuilt isolated app root and output label.
// Requires the locally installed Playwright skill; never runs migrations.
const { chromium } = require('C:/Users/mamou/.agents/skills/playwright/node_modules/playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const repo = process.cwd();
const [root, label] = process.argv.slice(2);
if (!root || !label || !/^[a-z0-9-]+$/.test(label)) throw Error('Provide build root and output label');
require('@next/env').loadEnvConfig(repo);
const outDir = path.join(repo, 'artifacts/performance-phase3', label);
fs.mkdirSync(outDir, { recursive: true });
const base = 'http://127.0.0.1:3198';
const routes = { home:'/', shop:'/shop', category:'/category/animal-sculptures', product:'/products/alhjr-ballwn-alaswd-allama', search:'/shop?search=garden' };
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3198', '-H', '127.0.0.1'], { cwd: root, env: process.env, stdio:'ignore', windowsHide:true });
const output = { note:'Local Chromium, no network or CPU throttling; three navigations, same context and warm cache; transferSize excludes cache hits. Not field data.', routes, measurements:{}, errors:[] };
let browser;
(async () => {
  try {
    let ready = false;
    for (let i=0;i<100;i++) { try { ready=(await fetch(base+'/robots.txt')).ok; } catch {} if (ready) break; await new Promise(r=>setTimeout(r,250)); }
    if (!ready) throw Error('Server not ready');
    browser = await chromium.launch({headless:true});
    for (const [device, viewport] of Object.entries({ mobile:{width:390,height:844}, desktop:{width:1365,height:900} })) {
      const context=await browser.newContext({viewport, deviceScaleFactor:1});
      await context.addInitScript(() => {
        window.__phase3={lcp:null,cls:0};
        new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__phase3.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__phase3.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
      });
      const page=await context.newPage();
      page.on('pageerror',e=>output.errors.push({device,error:e.message}));
      output.measurements[device]={};
      for(const [name,route] of Object.entries(routes)) {
        const samples=[];
        for(let i=0;i<3;i++) {
          const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:60000});
          const metric=await page.evaluate(()=>{
            const entries=performance.getEntriesByType('resource');
            const sum=(filter)=>entries.filter(filter).reduce((n,e)=>n+e.transferSize,0);
            const nav=performance.getEntriesByType('navigation')[0];
            return {...window.__phase3,ttfb:nav.responseStart, htmlTransfer:nav.transferSize, dom:document.getElementsByTagName('*').length, requests:entries.length, jsTransfer:sum(e=>e.name.includes('/_next/static/') && e.name.includes('.js')), imageTransfer:sum(e=>e.initiatorType==='img'), images:entries.filter(e=>e.initiatorType==='img').map(e=>({name:new URL(e.name).pathname,bytes:e.transferSize})).sort((a,b)=>b.bytes-a.bytes).slice(0,1)};
          });
          samples.push({status:response.status(),...metric});
          if(i===2 && name!=='search') await page.screenshot({path:path.join(outDir,`${device}-${name}.png`),fullPage:true});
        }
        output.measurements[device][name]=samples;
      }
      await context.close();
    }
    for(const [name,route] of Object.entries(routes)) {
      const response=await fetch(base+route,{headers:{RSC:'1','Accept-Encoding':'identity'}});
      const body=await response.arrayBuffer();
      output.measurements.rsc ??= {};
      output.measurements.rsc[name]={status:response.status,bytes:body.byteLength,contentType:response.headers.get('content-type')};
    }
  } finally {
    if(browser) await browser.close();
    server.kill();
    if(server.exitCode===null) await new Promise(r=>server.once('exit',r));
    fs.writeFileSync(path.join(outDir,'browser-details.json'),JSON.stringify(output,null,2));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
