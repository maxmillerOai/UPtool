import { basename, extname } from "node:path";
import { multipartStreamBody } from "./direct-http-helpers.mjs";

const PIXHOST_UPLOAD_URL = "https://api.pixhost.to/images";

function assertAbsolutePath(filePath) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error("Pass an absolute file path to uploadPixHost().");
  }
}

function contentTypeFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

function normalizeUrl(url) {
  return String(url || "").replace(/^http:\/\//i, "https://");
}

export async function uploadPixHost({
  filePath,
  contentType = 0,
  maxThumbnailSize = 300,
  onProgress,
} = {}) {
  assertAbsolutePath(filePath);
  if (![0, 1].includes(Number(contentType))) {
    throw new Error("PixHost contentType must be 0 for family safe or 1 for adult/NSFW.");
  }

  const multipart = await multipartStreamBody(
    {
      content_type: String(contentType),
      max_th_size: String(maxThumbnailSize),
    },
    {
      fieldName: "img",
      fileName: basename(filePath),
      contentType: contentTypeFor(filePath),
      path: filePath,
      onProgress,
    },
  );

  const response = await fetch(PIXHOST_UPLOAD_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
    },
    body: multipart.body,
    duplex: "half",
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`PixHost returned non-JSON response: ${text.slice(0, 500)}`);
  }

  if (!response.ok || !data.show_url || !data.th_url) {
    throw new Error(`PixHost upload failed: ${JSON.stringify(data)}`);
  }

  const showUrl = normalizeUrl(data.show_url);
  const thumbnailUrl = normalizeUrl(data.th_url);

  return {
    bbcode: `[URL=${showUrl}][IMG]${thumbnailUrl}[/IMG][/URL]`,
    showUrl,
    thumbnailUrl,
    name: data.name || basename(filePath),
    raw: data,
  };
}
