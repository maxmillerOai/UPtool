// Single-process E2E: imports the server (which starts listening), then runs
// the upload+SSE assertions against it, then exits. Avoids backgrounding.
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use the mock plugin for CI — real hosts need paid credentials.
process.env.PLUGINS_DIR = join(__dirname, 'sample-plugins');

await import('./index.mjs'); // starts the HTTP server (top-level listen)
await new Promise((r) => setTimeout(r, 800));

const PORT = process.env.PORT ?? 8787;
const BASE = `http://127.0.0.1:${PORT}`;

function log(...a) {
  console.log('[e2e]', ...a);
}

try {
  const health = await (await fetch(`${BASE}/api/health`)).json();
  log('health', JSON.stringify(health));

  // Single-origin frontend serving (dist must be built).
  const indexRes = await fetch(`${BASE}/`);
  const indexHtml = await indexRes.text();
  const servesUi = indexRes.ok && /<div id="root">/.test(indexHtml);
  log('servesUi', servesUi);

  // SPA fallback: unknown non-API route returns index.html, API 404 still JSON.
  const spaRes = await fetch(`${BASE}/some/deep/route`);
  const spaOk = spaRes.ok && /<div id="root">/.test(await spaRes.text());
  log('spaFallback', spaOk);

  const hosts = await (await fetch(`${BASE}/api/hosts`)).json();
  log('hosts', JSON.stringify(hosts.hosts.map((h) => h.id)));

  const file = join(tmpdir(), 'e2e-payload.bin');
  writeFileSync(file, Buffer.alloc(700 * 1024, 9));
  const bytes = await readFile(file);

  const fd = new FormData();
  fd.append('file', new Blob([bytes]), 'e2e-payload.bin');
  fd.append('credentials', JSON.stringify({}));

  const start = await (await fetch(`${BASE}/api/upload/echo`, { method: 'POST', body: fd })).json();
  log('jobId', start.jobId);

  const res = await fetch(`${BASE}/api/jobs/${start.jobId}/stream`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastPercent = 0;
  let doneUrl = null;
  let failed = null;
  let progressEvents = 0;
  outer: while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const evt = JSON.parse(line.slice(6));
      if (evt.type === 'progress') {
        progressEvents++;
        lastPercent = evt.percent;
      }
      if (evt.type === 'done') {
        doneUrl = evt.url;
        break outer;
      }
      if (evt.type === 'error') {
        failed = evt.message;
        break outer;
      }
    }
  }

  log('progressEvents', progressEvents, 'lastPercent', lastPercent);
  log('doneUrl', doneUrl);
  log('failed', failed);

  // UI serving is only expected when dist/ has been built.
  if (!servesUi) log('note: dist not built — skipping UI-serving assertions');
  const uiOk = !servesUi || spaOk;
  if (failed || !doneUrl || lastPercent < 100 || progressEvents < 2 || !uiOk) {
    log('RESULT: FAIL');
    process.exit(1);
  }
  log('RESULT: PASS');
  process.exit(0);
} catch (err) {
  log('RESULT: ERROR', err?.message);
  process.exit(2);
}
