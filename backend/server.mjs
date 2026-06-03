import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { createWriteStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

import { loadConfig, processVideoJob } from "./tool-core.mjs";
import { loadSettings, saveSettings } from "./app-settings.mjs";

const ROOT = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const PORT = Number(process.env.PORT || 8792);
const UPLOADS_DIR = resolve(ROOT, "incoming");
// Directory of the built React app. Set HPB_STATIC_DIR when packaged (Electron),
// otherwise default to the sibling `dist/` produced by `npm run build`.
const STATIC_DIR = process.env.HPB_STATIC_DIR || resolve(ROOT, "..", "dist");
const LIVE_JOBS = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body), { "Content-Type": "application/json; charset=utf-8" });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function mimeFor(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

const NO_BUILD_HTML = `<!doctype html><html><head><meta charset="utf-8">
<title>Host Post Builder</title></head><body style="font-family:sans-serif;background:#080c14;color:#e8f7ff;padding:40px">
<h2>Frontend build not found</h2>
<p>Run <code>npm run build</code> in the project root to generate <code>dist/</code>,
then restart this server. The JSON API is available at <code>/api/process</code>,
<code>/api/progress</code>, and <code>/api/settings</code>.</p>
</body></html>`;

/** Serves the built SPA with a single-page-app fallback to index.html. */
async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let relPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  let filePath = normalize(join(STATIC_DIR, relPath));

  // Prevent path traversal outside the static root.
  if (!filePath.startsWith(STATIC_DIR)) {
    filePath = join(STATIC_DIR, "index.html");
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(STATIC_DIR, "index.html"); // SPA fallback
  }
  if (!existsSync(filePath)) {
    send(res, 200, NO_BUILD_HTML, { "Content-Type": "text/html; charset=utf-8" });
    return;
  }
  try {
    const body = await readFile(filePath);
    send(res, 200, body, { "Content-Type": mimeFor(filePath) });
  } catch (error) {
    send(res, 500, String(error?.message || error));
  }
}

async function requestFormData(req) {
  const request = new Request("http://localhost/upload", {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
  return request.formData();
}

async function saveUploadedFile(file) {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const dest = join(UPLOADS_DIR, `${Date.now()}_${safeName}`);
  const stream = createWriteStream(dest);
  await new Promise((resolvePromise, reject) => {
    Readable.fromWeb(file.stream()).pipe(stream);
    stream.on("finish", resolvePromise);
    stream.on("error", reject);
  });
  return dest;
}

function mergeRuntimeCredentials(config, runtimeCredentials) {
  const merged = structuredClone(config);
  for (const [host, values] of Object.entries(runtimeCredentials || {})) {
    merged.credentials[host] = {
      ...(merged.credentials[host] || {}),
      ...Object.fromEntries(Object.entries(values || {}).filter(([, value]) => value !== "")),
    };
  }
  return merged;
}

function mergeDeep(base, overlay) {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) {
    return overlay ?? base;
  }
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(overlay)) {
    out[key] = mergeDeep(out[key], value);
  }
  return out;
}

async function handleProcess(req, res) {
  let jobId = "";
  try {
    let sourcePath = "";
    let title = "";
    let selectedImageHost = "imagetwist";
    let selectedFileHosts = [];
    let credentials = {};

    if (req.headers["content-type"] && String(req.headers["content-type"]).includes("application/json")) {
      const body = await readJsonBody(req);
      sourcePath = String(body.sourcePath || "");
      title = String(body.title || "").trim();
      selectedImageHost = String(body.imageHost || "imagetwist");
      selectedFileHosts = Array.isArray(body.fileHosts) ? body.fileHosts : [];
      credentials = body.credentials || {};
      jobId = String(body.jobId || Date.now());
    } else {
      const form = await requestFormData(req);
      const file = form.get("video");
      if (!file || typeof file === "string") {
        throw new Error("Drop or choose a video file first.");
      }

      sourcePath = await saveUploadedFile(file);
      title = String(form.get("title") || "").trim();
      selectedImageHost = String(form.get("imageHost") || "imagetwist");
      selectedFileHosts = String(form.get("fileHosts") || "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean);
      credentials = JSON.parse(String(form.get("credentials") || "{}"));
      jobId = String(form.get("jobId") || Date.now());
    }

    if (!sourcePath) {
      throw new Error("Choose a video file first.");
    }

    LIVE_JOBS.set(jobId, [{ type: "step", step: "queued", status: "running" }]);

    const savedSettings = await loadSettings();
    const config = mergeRuntimeCredentials(mergeDeep(await loadConfig(), savedSettings), credentials);
    const progress = [];
    const result = await processVideoJob({
      sourcePath,
      title,
      selectedImageHost,
      selectedFileHosts,
      config,
      onProgress: (event) => {
        progress.push(event);
        LIVE_JOBS.set(jobId, progress.slice());
      },
    });
    LIVE_JOBS.set(jobId, progress.concat([{ type: "step", step: "complete", status: "done" }]));

    json(res, 200, {
      ok: true,
      post: result.post,
      job: result.job,
      media: result.media,
      imageBbcode: result.imageBbcode,
      fileResults: result.fileResults,
      progress,
    });
  } catch (error) {
    if (jobId) {
      const existing = LIVE_JOBS.get(jobId) || [];
      LIVE_JOBS.set(jobId, existing.concat([{ type: "step", step: "error", status: "error", error: String(error?.message || error) }]));
    }
    json(res, 500, {
      ok: false,
      error: String(error?.message || error),
    });
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/process") {
    await handleProcess(req, res);
    return;
  }
  if (req.method === "GET" && req.url === "/api/settings") {
    json(res, 200, { ok: true, settings: await loadSettings() });
    return;
  }
  if (req.method === "GET" && req.url.startsWith("/api/progress")) {
    const url = new URL(req.url, "http://localhost");
    const jobId = url.searchParams.get("jobId") || "";
    json(res, 200, { ok: true, progress: LIVE_JOBS.get(jobId) || [] });
    return;
  }
  if (req.method === "POST" && req.url === "/api/settings") {
    try {
      const body = await readJsonBody(req);
      json(res, 200, { ok: true, settings: await saveSettings(body.settings || {}) });
    } catch (error) {
      json(res, 500, { ok: false, error: String(error?.message || error) });
    }
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }
  send(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`Host Post Builder running at http://localhost:${PORT}`);
});
