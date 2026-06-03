import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import { uploadKeep2Share, uploadFileBoom } from "./keep2share-api-adapter.mjs";
import { uploadRapidgator } from "./rapidgator-api-adapter.mjs";
import { uploadPixHost } from "./pixhost-api-adapter.mjs";
import { uploadImageTwistHttp } from "./imagetwist-http-adapter.mjs";
import { uploadFileJokerHttp } from "./filejoker-http-adapter.mjs";
import { parseSetCookie, mergeCookies } from "./direct-http-helpers.mjs";
import { buildPost } from "./post-template.mjs";

const ROOT = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
function resolveLocalPath(value) {
  if (!value) return "";
  return isAbsolute(value) ? value : resolve(ROOT, value);
}

export async function loadConfig(configPath = resolve(ROOT, "config.json")) {
  const fallback = JSON.parse(await readFile(resolve(ROOT, "config.example.json"), "utf8"));
  if (!existsSync(configPath)) {
    return fallback;
  }
  const user = JSON.parse(await readFile(configPath, "utf8"));
  return mergeDeep(fallback, user);
}

function mergeDeep(base, overlay) {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return overlay ?? base;
  const out = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    out[key] = mergeDeep(base?.[key], value);
  }
  return out;
}

function randomId(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function mmddyy(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function displayDate(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export async function prepareVideo({ sourcePath, date = new Date(), title }) {
  const id = `${mmddyy(date)}_${randomId(8)}`;
  const ext = extname(sourcePath) || ".mp4";
  const workDir = dirname(sourcePath);
  let renamedVideo = join(workDir, `${id}${ext.toLowerCase()}`);
  let suffix = 1;
  while (existsSync(renamedVideo)) {
    renamedVideo = join(workDir, `${id}_${suffix}${ext.toLowerCase()}`);
    suffix += 1;
  }

  if (resolve(sourcePath).toLowerCase() !== resolve(renamedVideo).toLowerCase()) {
    await rename(sourcePath, renamedVideo);
  }

  return {
    id,
    title: title || id,
    dateText: displayDate(date),
    workDir,
    videoPath: renamedVideo,
    thumbPath: join(workDir, `${id}_thumb.jpg`),
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(`${basename(command)} exited ${code}: ${stderr || stdout}`));
      }
    });
  });
}

export async function readMediaInfo({ filePath, config }) {
  const mediaInfoExe = resolveLocalPath(config.tools.mediainfo);
  const ext = extname(filePath).replace(".", "").toLowerCase() || "mp4";
  const sizeText = formatSize((await stat(filePath)).size);

  const durationRaw = (await runCommand(mediaInfoExe, [`--Inform=General;%Duration%`, filePath])).stdout.trim();
  const duration = formatDuration(durationRaw);
  const width = (await runCommand(mediaInfoExe, [`--Inform=Video;%Width%`, filePath])).stdout.trim();
  const height = (await runCommand(mediaInfoExe, [`--Inform=Video;%Height%`, filePath])).stdout.trim();
  const resolution = width && height ? `${width}x${height}` : "";

  return {
    format: ext,
    size: sizeText,
    duration,
    resolution,
    line: [ext, sizeText, duration, resolution].filter(Boolean).join(" - "),
  };
}

function formatDuration(durationMsRaw) {
  const durationMs = Number(String(durationMsRaw || "").trim());
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "";
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")} min ${String(seconds).padStart(2, "0")} s`;
  }
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

function formatSize(bytes) {
  if (bytes >= 1000 * 1000 * 1000) {
    return `${trimNumber(bytes / 1000 / 1000 / 1000)} GB`;
  }
  return `${trimNumber(bytes / 1000 / 1000)} MB`;
}

function trimNumber(value) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export async function generateThumbnail({ filePath, thumbPath, config }) {
  const mtnExe = resolveLocalPath(config.tools.mtn);
  const mtn = config.mtn || {};
  await runCommand(mtnExe, [
    "-P",
    "-c", String(mtn.columns || 3),
    "-r", String(mtn.rows || 4),
    "-h", String(mtn.minShotHeight ?? 0),
    "-w", String(mtn.width || 1024),
    "-j", String(mtn.quality || 90),
    "-k", String(mtn.backgroundColor || "000000"),
    "-o", mtn.thumbnailSuffix || "_thumb.jpg",
    "-O", dirname(thumbPath),
    filePath,
  ]);
  if (!existsSync(thumbPath)) {
    throw new Error(`MTN did not create expected thumbnail: ${thumbPath}`);
  }
  return thumbPath;
}

async function loginImageTwist({ username, password }) {
  if (!username || !password) throw new Error("ImageTwist username/password missing.");
  const response = await fetch("https://imagetwist.com/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ op: "login", redirect: "", login: username, password }),
    redirect: "manual",
  });
  return parseSetCookie(response.headers);
}

async function discoverImageTwist({ cookie }) {
  const response = await fetch("https://imagetwist.com/", { headers: cookie ? { Cookie: cookie } : {} });
  const html = await response.text();
  const formMatch = html.match(/<form[^>]+name=["']file["'][\s\S]*?<\/form>/i)
    || html.match(/<form[\s\S]*?name=["']file_0["'][\s\S]*?<\/form>/i);
  const formHtml = formMatch?.[0] || html;
  const formAction = formHtml.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1]
    || html.match(/<form[^>]*action=["']([^"']+)["'][^>]*>[\s\S]*?name=["']file_0["']/i)?.[1];
  const sessId = html.match(/name=["']sess_id["'][^>]*value=["']([^"']+)["']/i)?.[1];
  if (!formAction || !sessId) throw new Error("Could not discover ImageTwist upload form. Check credentials.");
  return { formAction: absoluteUrl(formAction, "https://imagetwist.com/"), sessId };
}

async function loginFileJoker({ email, password }) {
  if (!email || !password) throw new Error("FileJoker email/password missing.");
  const response = await fetch("https://filejoker.net/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ op: "login", redirect: "", email, password }),
    redirect: "manual",
  });
  return parseSetCookie(response.headers);
}

async function discoverFileJoker({ cookie }) {
  const response = await fetch("https://filejoker.net/", { headers: cookie ? { Cookie: cookie } : {} });
  const html = await response.text();
  const formMatch = html.match(/<form[^>]*id=["']ff_file["'][\s\S]*?<\/form>/i)
    || html.match(/<form[\s\S]*?name=["']file_1["'][\s\S]*?<\/form>/i);
  const formHtml = formMatch?.[0] || html;
  const formAction = formHtml.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1];
  const field = (name) => formHtml.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']+)["']`, "i"))?.[1];
  const sessId = field("sess_id");
  const srvId = field("srv_id");
  const srvTmpUrl = field("srv_tmp_url");
  if (!formAction || !sessId || !srvId || !srvTmpUrl) throw new Error("Could not discover FileJoker upload form. Check credentials.");
  return { formAction: absoluteUrl(formAction, "https://filejoker.net/"), sessId, srvId, srvTmpUrl };
}

function absoluteUrl(value, base) {
  return new URL(value, base).toString();
}

export async function uploadImage({ host, thumbPath, config, onProgress }) {
  if (host === "pixhost") {
    const result = await uploadPixHost({ filePath: thumbPath, maxThumbnailSize: 300, onProgress });
    return result.bbcode;
  }
  if (host === "imagetwist") {
    const creds = config.credentials.imagetwist || {};
    const loginCookie = await loginImageTwist(creds);
    const spec = await discoverImageTwist({ cookie: loginCookie });
    const result = await uploadImageTwistHttp({ ...spec, cookie: loginCookie, filePath: thumbPath, thumbSize: "300x300", onProgress });
    return result.bbcode;
  }
  throw new Error(`Unknown image host: ${host}`);
}

export async function uploadFileHost({ host, videoPath, config, onProgress }) {
  if (host === "keep2share") {
    const creds = config.credentials.keep2share || {};
    return (await uploadKeep2Share({
      accessToken: creds.accessToken,
      authToken: creds.authToken,
      username: creds.username,
      password: creds.password,
      filePath: videoPath,
      onProgress,
    })).plainText;
  }
  if (host === "fileboom") {
    const creds = config.credentials.keep2share || {};
    return (await uploadFileBoom({
      accessToken: creds.accessToken,
      authToken: creds.authToken,
      username: creds.username,
      password: creds.password,
      filePath: videoPath,
      onProgress,
    })).plainText;
  }
  if (host === "rapidgator") {
    const creds = config.credentials.rapidgator || {};
    return (await uploadRapidgator({ token: creds.token, username: creds.username, password: creds.password, filePath: videoPath, onProgress })).plainText;
  }
  if (host === "filejoker") {
    const creds = config.credentials.filejoker || {};
    const loginCookie = await loginFileJoker(creds);
    const spec = await discoverFileJoker({ cookie: loginCookie });
    return (await uploadFileJokerHttp({ ...spec, cookie: loginCookie, filePath: videoPath, onProgress })).plainText;
  }
  throw new Error(`Unknown file host: ${host}`);
}

export async function processVideoJob({
  sourcePath,
  title,
  selectedImageHost,
  selectedFileHosts,
  config,
  onProgress = () => {},
}) {
  onProgress({ type: "step", step: "prepared", status: "running", percent: 5 });
  const job = await prepareVideo({ sourcePath, title });
  onProgress({ type: "step", step: "prepared", status: "done", percent: 100, job });

  onProgress({ type: "step", step: "mediainfo", status: "running", percent: 25 });
  const media = await readMediaInfo({ filePath: job.videoPath, config });
  onProgress({ type: "step", step: "mediainfo", status: "done", percent: 100, media });

  onProgress({ type: "step", step: "thumbnail", status: "running", percent: 15 });
  await generateThumbnail({ filePath: job.videoPath, thumbPath: job.thumbPath, config });
  onProgress({ type: "step", step: "thumbnail", status: "done", percent: 100, thumbPath: job.thumbPath });

  onProgress({ type: "image", host: selectedImageHost, status: "running", percent: 0 });
  const imageBbcode = await uploadImage({
    host: selectedImageHost,
    thumbPath: job.thumbPath,
    config,
    onProgress: (progress) => onProgress({ type: "image", host: selectedImageHost, status: "running", ...progress }),
  });
  onProgress({ type: "image", host: selectedImageHost, status: "done", percent: 100, value: imageBbcode });

  const fileResults = await Promise.all(selectedFileHosts.map(async (host) => {
    onProgress({ type: "file", host, status: "running", percent: 0 });
    try {
      const link = await uploadFileHost({
        host,
        videoPath: job.videoPath,
        config,
        onProgress: (progress) => onProgress({ type: "file", host, status: "running", ...progress }),
      });
      onProgress({ type: "file", host, status: "done", percent: 100, link });
      return { host, link };
    } catch (error) {
      onProgress({ type: "file", host, status: "error", error: String(error?.message || error) });
      throw error;
    }
  }));

  const post = buildPost({
    title: job.title,
    date: job.dateText,
    imageBbcode,
    metadataLine: media.line,
    fileLinks: fileResults.map((item) => item.link),
  });

  const postPath = join(job.workDir, `${job.id}_post.txt`);
  await writeFile(postPath, post, "utf8");

  return {
    job,
    media,
    imageBbcode,
    fileResults,
    post,
    postPath,
  };
}
