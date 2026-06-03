import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";

import { loadConfig, processVideoJob } from "./tool-core.mjs";
import { loadSettings, saveSettings } from "./app-settings.mjs";

const ROOT = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const PORT = Number(process.env.PORT || 8792);
const UPLOADS_DIR = resolve(ROOT, "incoming");
const LIVE_JOBS = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body), { "Content-Type": "application/json; charset=utf-8" });
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
  await new Promise((resolve, reject) => {
    Readable.fromWeb(file.stream()).pipe(stream);
    stream.on("finish", resolve);
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


const INDEX_HTML = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <title>Host Post Builder (legacy UI)</title>
</head>
<body>
  <p>The bundled legacy UI has been replaced by the React frontend.</p>
  <p>This server now exposes the JSON API at <code>/api/process</code>,
     <code>/api/progress</code> and <code>/api/settings</code>.</p>
</body>
</html>`;


const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && new URL(req.url, "http://localhost").pathname === "/") {
    send(res, 200, INDEX_HTML, { "Content-Type": "text/html; charset=utf-8" });
    return;
  }
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
  send(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`Host Post Builder running at http://localhost:${PORT}`);
});
