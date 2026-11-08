// 실제 Node 서버와 production Chromium hydration을 같은 React 소비자에서 검증한다.
// 사용: node scripts/verify-ssr.mjs [--react-root /path/to/consumer]
// 사전 조건: npm run build. 설치/네트워크 요청 없이 지정 소비자의 React를 사용한다.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium, expect } from '@playwright/test';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--react-root'), 'Expected --react-root <consumer directory>');
const reactRoot = path.resolve(args[1] ?? repo);
const reactVersion = JSON.parse(await readFile(path.join(reactRoot, 'node_modules/react/package.json'), 'utf8')).version;
const domVersion = JSON.parse(await readFile(path.join(reactRoot, 'node_modules/react-dom/package.json'), 'utf8')).version;
assert.equal(reactVersion, domVersion);
assert.match(reactVersion, /^(18|19)\./);
async function manifest(entries) {
  const result = {};
  async function walk(key, file) {
    const { stat } = await import('node:fs/promises');
    if ((await stat(file)).isDirectory()) {
      for (const name of (await readdir(file)).sort()) await walk(`${key}/${name}`, path.join(file, name));
    } else result[key] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
  for (const [key, file] of entries) await walk(key, file);
  return result;
}
const inputEntries = [
  ...['dist', 'styles.css', 'package.json', 'package-lock.json', 'scripts/verify-ssr.mjs', 'test/fixtures/ssr-consumer.mjs'].map(name => [name, path.join(repo, name)]),
  ...['react', 'react-dom', '@radix-ui/react-icons'].map(name => [`runtime/${name}`, path.join(reactRoot, 'node_modules', name)]),
];
const inputsBefore = await manifest(inputEntries);
const output = path.join(repo, '.local/ssr-verification', `${new Date().toISOString().replaceAll(':', '-')}-react-${reactVersion}`);
const consumer = path.join(output, 'consumer');
await mkdir(path.join(consumer, 'node_modules/@radix-ui'), { recursive: true });
await writeFile(path.join(consumer, 'package.json'), '{"type":"module","private":true}');
for (const name of ['react', 'react-dom', '@radix-ui/react-icons']) {
  await symlink(path.join(reactRoot, 'node_modules', name), path.join(consumer, 'node_modules', name), 'dir');
}
await cp(path.join(repo, 'dist'), path.join(consumer, 'library'), { recursive: true });
await cp(path.join(repo, 'styles.css'), path.join(consumer, 'styles.css'));
await cp(path.join(repo, 'test/fixtures/ssr-consumer.mjs'), path.join(consumer, 'app.mjs'));
assert.deepEqual(await manifest([['dist', path.join(consumer, 'library')], ['styles.css', path.join(consumer, 'styles.css')]]),
  Object.fromEntries(Object.entries(inputsBefore).filter(([key]) => key.startsWith('dist/') || key === 'styles.css')));
await writeFile(path.join(output, 'inputs-before.json'), JSON.stringify(inputsBefore, null, 2));
await writeFile(path.join(consumer, 'server.mjs'), `
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { writeFile } from 'node:fs/promises';
import { App, caseNames } from './app.mjs';
if (typeof window !== 'undefined' || typeof document !== 'undefined') throw Error('SERVER_DOM_PRESENT');
const errors = []; console.error = (...args) => errors.push(args.map(String).join(' '));
const cases = [];
for (const caseName of caseNames) {
  const markup = renderToString(h(App, {caseName}), {identifierPrefix:'ssr024-'});
  await writeFile(new URL(caseName+'.html',import.meta.url), '<!doctype html><html><head><meta charset="utf-8"><title>SSR '+caseName+'</title></head><body data-case="'+caseName+'"><div id="root">'+markup+'</div><script type="module" src="/client.mjs"></script></body></html>');
  cases.push({caseName, rows:(markup.match(/data-comins-row-data-index=/g)??[]).length, roots:(markup.match(/data-comins-table-instance-id=/g)??[]).length});
}
await writeFile(new URL('server.json',import.meta.url), JSON.stringify({cases,errors}));
if(errors.length) process.exitCode = 1;
`);
await writeFile(path.join(consumer, 'client.mjs'), `
import { createElement as h } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './app.mjs';
import './styles.css';
const host=document.getElementById('root');
window.__ssrInitialTable=host.querySelector('[data-comins-table-instance-id]');
window.__ssrInitialRow=host.querySelector('tr[data-comins-row-data-index]');
window.__ssrErrors=[];
const root=hydrateRoot(host,h(App,{caseName:document.body.dataset.case,mismatch:location.search==='?mismatch'}),{identifierPrefix:'ssr024-',onRecoverableError:error=>window.__ssrErrors.push(String(error))});
window.__ssrUnmount=()=>root.unmount();
`);
const server = spawnSync(process.execPath, ['server.mjs'], { cwd: consumer, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_ENV: 'development' } });
const serverReport = JSON.parse(await readFile(path.join(consumer, 'server.json'), 'utf8'));
await writeFile(path.join(output, 'server.json'), JSON.stringify({ ...serverReport, exitCode: server.status, stderr: server.stderr }, null, 2));
assert.equal(server.status, 0, `SSR server errors: ${JSON.stringify(serverReport.errors.slice(0, 3))}; ${server.stderr}`);
assert.deepEqual(serverReport.errors, []);
assert.equal(serverReport.cases.length, 6);
for (const item of serverReport.cases) {
  assert.equal(item.roots, item.caseName === 'multiple' ? 2 : 1);
  if (['empty', 'loading'].includes(item.caseName)) assert.equal(item.rows, 0);
  else if (item.caseName === 'virtualized') assert(item.rows > 0 && item.rows < 100000);
  else assert.equal(item.rows, item.caseName === 'multiple' ? 6 : 3);
}
if (process.env.SSR_SERVER_ONLY === '1') { assert.deepEqual(await manifest(inputEntries), inputsBefore); console.log(JSON.stringify({ output, reactVersion, server: 'PASS' })); process.exit(0); }
const config = { configFile: false, root: consumer, logLevel: 'warn', resolve: { alias: {
  react: path.join(reactRoot, 'node_modules/react'), 'react-dom': path.join(reactRoot, 'node_modules/react-dom'),
} }, build: { rollupOptions: { input: Object.fromEntries(serverReport.cases.map(x => [x.caseName, path.join(consumer, x.caseName + '.html')])) } }, preview: { host: '127.0.0.1', port: 0 } };
await build(config);
const clientEntries = [['client', path.join(consumer, 'dist')]];
const clientBefore = await manifest(clientEntries);
const serving = await preview(config);
const address = serving.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
async function servedManifest() {
  const hashes = {};
  for (const key of Object.keys(clientBefore).filter(key => /\.(js|css|html)$/.test(key))) {
    const response = await fetch(`${baseURL}/${key.slice('client/'.length)}`);
    assert.equal(response.status, 200);
    hashes[key] = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(hashes[key], clientBefore[key]);
  }
  return hashes;
}
const results = [];
let browser;
async function expectContentState(page, caseName) {
  await expect(page.getByTestId('loading-skeleton-row')).toHaveCount(caseName === 'loading' ? 3 : 0);
  await expect(page.getByTestId('data-table-empty-state')).toHaveCount(caseName === 'empty' ? 1 : 0);
  if (caseName === 'empty') await expect(page.getByTestId('data-table-empty-state')).toBeVisible();
  if (caseName === 'loading') await expect(page.locator('[data-comins-table-instance-id]')).toHaveAttribute('aria-busy', 'true');
}
try {
  const servedBefore = await servedManifest();
  browser = await chromium.launch();
  for (const item of serverReport.cases) {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage(); await page.goto(`${baseURL}/${item.caseName}.html`);
      await expect(page.locator('[data-comins-table-instance-id]')).toHaveCount(item.roots);
      await expect(page.locator('[data-comins-table-instance-id]').first()).toBeVisible();
      await expect(page.locator('tr[data-comins-row-data-index]')).toHaveCount(item.rows);
      await expectContentState(page, item.caseName);
      results.push({ caseName: item.caseName, phase: 'no-js', status: 'PASS' });
    } finally { await context.close(); }
  }
  for (const name of [...serverReport.cases.map(x => x.caseName), 'mismatch']) {
    const mismatch = name === 'mismatch', item = serverReport.cases.find(x => x.caseName === (mismatch ? 'basic' : name));
    const context = await browser.newContext(), page = await context.newPage(), diagnostics = [];
    page.on('pageerror', e => diagnostics.push(String(e)));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) diagnostics.push(m.text()); });
    try {
      await page.goto(`${baseURL}/${item.caseName}.html${mismatch ? '?mismatch' : ''}`);
      await page.waitForFunction(() => window.__ssrReady === true);
      const proof = await page.evaluate(() => ({ errors: window.__ssrErrors, tableSame: window.__ssrInitialTable === document.querySelector('[data-comins-table-instance-id]'), rowSame: window.__ssrInitialRow === document.querySelector('tr[data-comins-row-data-index]'), ids: [...document.querySelectorAll('[data-comins-table-instance-id]')].map(x => x.dataset.cominsTableInstanceId) }));
      if (mismatch) { assert(proof.errors.length > 0); assert.equal(proof.tableSame, false); }
      else {
        await expectContentState(page, name);
        assert.deepEqual(proof.errors, []); assert.equal(proof.tableSame, true); assert.equal(proof.rowSame, true);
        assert.equal(new Set(proof.ids).size, item.roots); assert(proof.ids.every(x => x.includes('ssr024-')));
        if (!['empty', 'loading'].includes(name)) {
          const table = page.locator('[data-comins-table-instance-id]').first(), header = table.getByTestId('header-name');
          for (const [sort, first] of [['ascending', 'Alpha'], ['descending', 'Zulu']]) {
            await header.click(); await expect(header).toHaveAttribute('aria-sort', sort);
            await table.getByTestId('ssr-table').evaluate(e => { e.scrollTop = 0; e.dispatchEvent(new Event('scroll', { bubbles: true })); });
            await expect(table.locator('tr[data-comins-row-data-index]').first()).toContainText(first);
          }
        }
        if (name === 'basic') await page.screenshot({ path: path.join(output, 'hydrated-excel.png') });
        await page.evaluate(() => window.__ssrUnmount());
        await expect(page.locator('[data-comins-table-instance-id]')).toHaveCount(0);
        assert.deepEqual(diagnostics, []);
        assert.deepEqual(await page.evaluate(() => window.__ssrErrors), []);
      }
      results.push({ caseName: name, phase: 'hydration', status: mismatch ? 'NEGATIVE_CONTROL_DETECTED' : 'PASS', proof, diagnostics });
    } finally { await context.close(); }
  }
  const inputsAfter = await manifest(inputEntries), clientAfter = await manifest(clientEntries);
  assert.deepEqual(inputsAfter, inputsBefore); assert.deepEqual(clientAfter, clientBefore);
  assert.deepEqual(await servedManifest(), servedBefore);
  await writeFile(path.join(output, 'inputs-after.json'), JSON.stringify(inputsAfter, null, 2));
  await writeFile(path.join(output, 'client-manifest.json'), JSON.stringify(clientAfter, null, 2));
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ reactVersion, domVersion, node: process.version, browser: browser.version(), inputsUnchanged: true, clientUnchanged: true, servedBefore, server: serverReport, results }, null, 2));
  console.log(JSON.stringify({ output, reactVersion, passed: results.length }));
} finally { await browser?.close(); await new Promise(resolve => serving.httpServer.close(resolve)); }
