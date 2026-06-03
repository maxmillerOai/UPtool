import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { tmpdir } from 'node:os';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadPlugins } from './pluginLoader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8787);
const PLUGINS_DIR =
  process.env.PLUGINS_DIR ?? new URL('./sample-plugins', import.meta.url).pathname;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 0) || Infinity;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Multer writes incoming files to a temp dir; the plugins need an absolute path.
const uploadTmp = mkdtempSync(join(tmpdir(), 'uptool-'));
const upload = multer({
  storage: multer.diskStorage({
    // Each file lands in its own subdir so the plugin sees the ORIGINAL
    // filename (hosts use it as the uploaded name) without collisions.
    destination: (_req, _file, cb) => {
      const dir = join(uploadTmp, randomUUID());
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
  }),
  limits: MAX_UPLOAD_BYTES === Infinity ? undefined : { fileSize: MAX_UPLOAD_BYTES },
});

function sanitizeFilename(name) {
  const base = (name || 'upload.bin').replace(/[\\/]/g, '_').replace(/\0/g, '');
  return base.trim() || 'upload.bin';
}

let plugins = await loadPlugins(PLUGINS_DIR);
console.log(`[server] ${plugins.size} plugin(s) loaded from ${PLUGINS_DIR}`);

/** In-memory job registry for progress streaming. */
const jobs = new Map();

function createJob() {
  const id = randomUUID();
  const job = {
    id,
    status: 'pending',
    progress: 0,
    loaded: 0,
    total: 0,
    result: null,
    error: null,
    listeners: new Set(),
  };
  jobs.set(id, job);
  // Auto-expire finished jobs after 5 minutes.
  setTimeout(() => jobs.delete(id), 5 * 60 * 1000).unref?.();
  return job;
}

function emit(job, event) {
  for (const send of job.listeners) {
    try {
      send(event);
    } catch {
      /* listener gone */
    }
  }
}

/**
 * Builds credentials for a plugin by merging environment-provided defaults with
 * request-provided values (request wins). Env keys follow the convention
 * `${HOSTID}_FIELD`, e.g. RAPIDGATOR_USERNAME, RAPIDGATOR_PASSWORD,
 * RAPIDGATOR_TOKEN, RAPIDGATOR_TWOFACTORCODE, RAPIDGATOR_FOLDERID.
 */
function resolveCredentials(hostId, requestCreds = {}) {
  const prefix = hostId.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const envCreds = {};
  const map = {
    token: 'TOKEN',
    username: 'USERNAME',
    password: 'PASSWORD',
    twoFactorCode: 'TWOFACTORCODE',
    folderId: 'FOLDERID',
    apiKey: 'APIKEY',
    accessToken: 'ACCESSTOKEN',
  };
  for (const [field, suffix] of Object.entries(map)) {
    const val = process.env[`${prefix}_${suffix}`];
    if (val != null && val !== '') envCreds[field] = val;
  }
  const clean = {};
  for (const [k, v] of Object.entries(requestCreds || {})) {
    if (v != null && v !== '') clean[k] = v;
  }
  return { ...envCreds, ...clean };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, plugins: plugins.size });
});

app.get('/api/hosts', (_req, res) => {
  const list = [...plugins.values()].map((p) => ({
    id: p.id,
    label: p.label,
    source: p.source,
    credentialFields: p.credentialFields,
  }));
  res.json({ hosts: list });
});

// Reloads plugins from disk (handy after pushing new plugin files).
app.post('/api/reload', async (_req, res) => {
  plugins = await loadPlugins(PLUGINS_DIR);
  res.json({ ok: true, plugins: plugins.size });
});

/**
 * Accepts a multipart upload (field name "file") plus an optional JSON string
 * field "credentials". Kicks off the plugin upload asynchronously and returns a
 * jobId the client subscribes to for progress via SSE.
 */
app.post('/api/upload/:hostId', upload.single('file'), async (req, res) => {
  const { hostId } = req.params;
  const plugin = plugins.get(hostId);
  if (!plugin) {
    if (req.file) rmSync(dirname(req.file.path), { recursive: true, force: true });
    return res.status(404).json({ error: `Unknown host plugin: ${hostId}` });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided (field "file")' });
  }

  let requestCreds = {};
  if (req.body?.credentials) {
    try {
      requestCreds =
        typeof req.body.credentials === 'string'
          ? JSON.parse(req.body.credentials)
          : req.body.credentials;
    } catch {
      rmSync(dirname(req.file.path), { recursive: true, force: true });
      return res.status(400).json({ error: 'credentials must be valid JSON' });
    }
  }

  const job = createJob();
  job.total = req.file.size;
  res.json({ jobId: job.id });

  const credentials = resolveCredentials(hostId, requestCreds);
  const filePath = req.file.path;

  (async () => {
    job.status = 'uploading';
    try {
      const result = await plugin.upload({
        filePath,
        credentials,
        onProgress: (p) => {
          const norm = normalizeProgress(p, job.total);
          job.loaded = norm.loaded;
          job.total = norm.total || job.total;
          job.progress = norm.percent;
          emit(job, { type: 'progress', loaded: job.loaded, total: job.total, percent: job.progress });
        },
      });
      const link = result?.link ?? result?.plainText ?? result?.url;
      if (!link) throw new Error('Plugin did not return a link');
      job.status = 'completed';
      job.progress = 100;
      job.result = { url: link, raw: result?.raw ?? null };
      emit(job, { type: 'done', url: link, raw: job.result.raw });
    } catch (err) {
      job.status = 'failed';
      job.error = sanitizeError(err);
      emit(job, { type: 'error', message: job.error });
    } finally {
      rmSync(dirname(filePath), { recursive: true, force: true });
      job.listeners.clear();
    }
  })();
});

// SSE stream of job progress.
app.get('/api/jobs/:jobId/stream', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  // Replay current state so late subscribers catch up.
  if (job.status === 'completed' && job.result) {
    send({ type: 'progress', loaded: job.loaded, total: job.total, percent: 100 });
    send({ type: 'done', url: job.result.url, raw: job.result.raw });
    return res.end();
  }
  if (job.status === 'failed') {
    send({ type: 'error', message: job.error });
    return res.end();
  }
  send({ type: 'progress', loaded: job.loaded, total: job.total, percent: job.progress });

  const listener = (event) => {
    send(event);
    if (event.type === 'done' || event.type === 'error') {
      res.end();
    }
  };
  job.listeners.add(listener);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(keepAlive);
    job.listeners.delete(listener);
  });
});

function normalizeProgress(p, fallbackTotal) {
  if (typeof p === 'number') {
    // Could be a fraction (0..1), a percent (0..100), or raw bytes loaded.
    if (p <= 1) return { loaded: p * fallbackTotal, total: fallbackTotal, percent: p * 100 };
    if (p <= 100) return { loaded: (p / 100) * fallbackTotal, total: fallbackTotal, percent: p };
    return { loaded: p, total: fallbackTotal, percent: fallbackTotal ? (p / fallbackTotal) * 100 : 0 };
  }
  if (p && typeof p === 'object') {
    const loaded = Number(p.loaded ?? p.transferred ?? p.bytes ?? 0);
    const total = Number(p.total ?? p.length ?? fallbackTotal ?? 0);
    const percent =
      p.percent != null ? Number(p.percent) : total > 0 ? (loaded / total) * 100 : 0;
    return { loaded, total, percent: Math.max(0, Math.min(100, percent)) };
  }
  return { loaded: 0, total: fallbackTotal, percent: 0 };
}

/** Strips anything that looks like a secret from an error message. */
function sanitizeError(err) {
  let msg = err instanceof Error ? err.message : String(err);
  msg = msg.replace(/("?(?:token|password|login|email|auth|code)"?\s*[:=]\s*)("[^"]*"|[^,\s}]+)/gi, '$1<redacted>');
  return msg.slice(0, 600);
}

// In production, serve the built frontend from the same origin so no CORS/proxy
// is needed. (In dev, use `npm run dev` which proxies /api to this server.)
const distDir = join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback for any non-API GET that didn't match a static asset.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(join(distDir, 'index.html'));
  });
  console.log(`[server] Serving built frontend from ${distDir}`);
}

const usingSamples = !process.env.PLUGINS_DIR;
app.listen(PORT, () => {
  console.log(`[server] UPtool plugin bridge listening on http://localhost:${PORT}`);
  console.log(`[server] Plugins dir: ${PLUGINS_DIR}${usingSamples ? ' (sample/mock — set PLUGINS_DIR for real hosts)' : ''}`);
});
