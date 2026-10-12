// Trusted local candidate only; each consumer uses the same immutable tarball.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2]?.endsWith('.tgz'), 'Usage: node test/xlsx-public-package-consumer.mjs <trusted-local.tgz>');
const artifact = resolve(process.argv[2]); const digest = () => createHash('sha256').update(readFileSync(artifact)).digest('hex'); const hash = digest();
const directory = mkdtempSync(resolve(tmpdir(), 'comins-xlsx-consumer-'));
const env = { ...process.env }; delete env.NODE_PATH; delete env.NODE_OPTIONS;
let server; let browser;
function command(exe,args) { return spawnSync(exe,args,{cwd:directory,env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024}); }
function run(exe,args) { const r=command(exe,args); if(r.stdout) process.stdout.write(r.stdout); if(r.stderr) process.stderr.write(r.stderr); assert.equal(r.error,undefined); assert.equal(r.status,0); }
function negative(path,exe,args,diagnostic) { const held=`${path}.negative-control`; renameSync(path,held); try { const r=command(exe,args); assert.equal(r.error,undefined); assert.ok(r.status>0); assert.match(r.stdout+r.stderr,diagnostic); console.log(`Negative control: missing ${path.split('/').pop()} rejected`); } finally { renameSync(held,path); } }
try {
  console.log(`XLSX candidate artifact SHA-256: ${hash}`);
  writeFileSync(resolve(directory,'package.json'),JSON.stringify({private:true,type:'module'}));
  run('npm',['install','--ignore-scripts','--no-audit','--no-fund','--no-package-lock',artifact,'vue@3','react@19','react-dom@19']);
  cpSync(resolve(repository,'test/fixtures/xlsx-public-consumer'),directory,{recursive:true});
  // Negative type fixtures are type-only; do not execute their deliberately invalid calls in browser.
  const typed = readFileSync(resolve(directory,'consumer.ts'),'utf8');
  writeFileSync(resolve(directory,'smoke.ts'),typed.slice(0,typed.indexOf('const payload:')));
  for (const file of ['browser.ts','worker.ts']) writeFileSync(resolve(directory,file),readFileSync(resolve(directory,file),'utf8').replace('./consumer','./smoke'));
  writeFileSync(resolve(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true,skipLibCheck:false,types:[],lib:['ES2022'],noEmit:true},files:['consumer.ts']}));
  const tsc = resolve(repository,'node_modules/.bin/tsc'); const vite = resolve(repository,'node_modules/.bin/vite');
  run(tsc,['-p','tsconfig.json']); run(process.execPath,['runtime.mjs']);
  const installed = resolve(directory,'node_modules/comins-table');
  negative(resolve(installed,'dist/xlsx.d.ts'),tsc,['-p','tsconfig.json'],/comins-table\/xlsx/);
  negative(resolve(installed,'dist/xlsx.js'),process.execPath,['runtime.mjs'],/xlsx\.js|ERR_MODULE_NOT_FOUND/);
  negative(resolve(directory,'node_modules/xlsx'),process.execPath,['runtime.mjs'],/xlsx|ERR_MODULE_NOT_FOUND/);
  run(tsc,['-p','tsconfig.json']); run(process.execPath,['runtime.mjs']);
  writeFileSync(resolve(directory,'boundary-entry.ts'),"import * as Core from 'comins-table/core'; import * as Table from 'comins-table'; console.log(Core,Table);");
  writeFileSync(resolve(directory,'vite.boundary.config.mjs'),`export default { build: { outDir:'boundary-dist', lib:{entry:'boundary-entry.ts',formats:['es']} }, plugins:[{name:'xlsx-boundary',generateBundle(){for(const id of this.getModuleIds()) if(['xlsx','saxes','xmlchars','@zip.js'].some(name=>id.includes('/node_modules/'+name+'/'))) throw new Error('XLSX_ENGINE_BOUNDARY');}}] };`);
  run(vite,['build','--config','vite.boundary.config.mjs']);
  const coreFile=resolve(installed,'dist/core.js'); const originalCore=readFileSync(coreFile,'utf8');
  try { writeFileSync(coreFile,"import 'xlsx';\n"+originalCore); const r=command(vite,['build','--config','vite.boundary.config.mjs']); assert.ok(r.status>0); assert.match(r.stdout+r.stderr,/XLSX_ENGINE_BOUNDARY/); console.log('Negative control: engine leak into Core rejected'); } finally { writeFileSync(coreFile,originalCore); }
  run(vite,['build','--config','vite.boundary.config.mjs']);
  writeFileSync(resolve(directory,'index.html'),'<div id="app"></div><output id="worker-result"></output><script type="module" src="/browser.ts"></script>');
  writeFileSync(resolve(directory,'vite.config.mjs'),'export default { build: { sourcemap:true } };');
  run(vite,['build']);
  server=spawn(vite,['preview','--host','127.0.0.1','--port','4043','--strictPort'],{cwd:directory,env,stdio:['ignore','pipe','pipe']});
  let serverLog=''; server.stdout.on('data',d=>{serverLog+=d;}); server.stderr.on('data',d=>{serverLog+=d;});
  for(let i=0;i<100;i++) { try { const response=await fetch('http://127.0.0.1:4043'); if(response.ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); if(i===99) throw new Error(serverLog); }
  browser=await chromium.launch(); const page=await browser.newPage(); const errors=[]; const external=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4043/')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:')) external.push(r.url());});
  await page.goto('http://127.0.0.1:4043');
  await page.waitForFunction(()=>document.querySelector('#vue-result')?.textContent?.includes('001')&&document.querySelector('#worker-result')?.textContent?.includes('001'));
  assert.match(await page.locator('#vue-result').textContent(),/"score":0,"active":false/); assert.match(await page.locator('#worker-result').textContent(),/"score":0,"active":false/); assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  assert.equal(digest(),hash); console.log('Same artifact: ES2022 types, Node, Vue3 byte API, production browser/module Worker, no external requests or uncaught errors passed');
} finally { if(browser) await browser.close(); if(server) { server.kill(); await new Promise(r=>server.once('exit',r)); } rmSync(directory,{recursive:true,force:true}); }
