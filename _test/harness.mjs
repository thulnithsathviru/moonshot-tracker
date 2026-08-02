// Minimal CDP driver: launches headless Chrome, loads the tracker, runs steps.
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 8731, CDP = 9333;

// --- static server -----------------------------------------------------
const types = {'.html':'text/html','.json':'application/json','.js':'text/javascript','.png':'image/png'};
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(p)] || 'application/octet-stream'});
    res.end(b);
  });
});
await new Promise(r => server.listen(PORT, r));

// --- chrome ------------------------------------------------------------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const dl = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1600,1000', 'about:blank'
], {stdio: 'ignore'});

async function targets() {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error('chrome never came up');
}
const page = (await targets()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, {once: true}));

let id = 0;
const pending = new Map();
export const logs = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled')
    logs.push({type: m.params.type, text: m.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a.preview ?? '')).join(' ')});
  if (m.method === 'Runtime.exceptionThrown')
    logs.push({type: 'pageerror', text: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text});
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
    logs.push({type: 'log:' + m.params.entry.source, text: m.params.entry.text + ' ' + (m.params.entry.url || '')});
});
function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({id: mid, method, params}));
  return new Promise(r => pending.set(mid, r));
}
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
// NEVER let the test reach the shared Supabase row — it is live production data
// that anyone with the link can overwrite. Reads AND writes are blocked, so the
// page falls back to data.json and every autosave dies at the network layer.
await send('Network.enable');
await send('Network.setBlockedURLs', {urls: ['*aopjjoxofnqhfowacvrt*', '*supabase*']});
await send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: dl});

export async function evalJS(expr) {
  const r = await send('Runtime.evaluate', {expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true});
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed');
  return r.result?.result?.value;
}
export async function goto(url) {
  await send('Page.navigate', {url});
  for (let i = 0; i < 80; i++) {
    const st = await evalJS('return document.readyState');
    if (st === 'complete') break;
    await new Promise(r => setTimeout(r, 150));
  }
}
export const URLBASE = `http://127.0.0.1:${PORT}/`;
export const DLDIR = dl;
export function done() { ws.close(); chrome.kill(); server.close(); }
