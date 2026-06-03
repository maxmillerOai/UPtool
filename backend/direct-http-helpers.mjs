import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";

export function multipartBody(fields, files = []) {
  const boundary = `----codex-http-${randomUUID()}`;
  const encoder = new TextEncoder();
  const chunks = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(encoder.encode(`--${boundary}\r\n`));
    chunks.push(encoder.encode(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    chunks.push(encoder.encode(`${value}\r\n`));
  }

  for (const file of files) {
    chunks.push(encoder.encode(`--${boundary}\r\n`));
    chunks.push(encoder.encode(`Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\n`));
    chunks.push(encoder.encode(`Content-Type: ${file.contentType || "application/octet-stream"}\r\n\r\n`));
    chunks.push(file.bytes);
    chunks.push(encoder.encode("\r\n"));
  }

  chunks.push(encoder.encode(`--${boundary}--\r\n`));

  const total = chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function multipartStreamBody(fields, file) {
  if (!file || !file.path) {
    throw new Error("multipartStreamBody missing file.path");
  }
  const boundary = `----codex-http-${randomUUID()}`;
  const encoder = new TextEncoder();
  const fileInfo = await stat(file.path);

  const fieldParts = [];
  for (const [name, value] of Object.entries(fields)) {
    fieldParts.push(`--${boundary}\r\n`);
    fieldParts.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
    fieldParts.push(`${value}\r\n`);
  }

  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\n` +
    `Content-Type: ${file.contentType || "application/octet-stream"}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;

  const prefix = encoder.encode(fieldParts.join("") + fileHeader);
  const suffix = encoder.encode(fileFooter);
  const contentLength = prefix.byteLength + fileInfo.size + suffix.byteLength;

  async function* streamParts() {
    yield prefix;
    file.onProgress?.({ loaded: 0, total: fileInfo.size, percent: 0 });
    let loaded = 0;
    let lastPercent = -1;
    for await (const chunk of createReadStream(file.path)) {
      loaded += chunk.byteLength;
      const percent = fileInfo.size > 0 ? Math.min(100, Math.round((loaded / fileInfo.size) * 100)) : 100;
      if (percent !== lastPercent) {
        file.onProgress?.({ loaded, total: fileInfo.size, percent });
        lastPercent = percent;
      }
      yield chunk;
    }
    yield suffix;
    file.onProgress?.({ loaded: fileInfo.size, total: fileInfo.size, percent: 100 });
  }

  return {
    body: streamParts(),
    contentLength,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export function contentTypeFor(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export function absolutePathRequired(filePath, functionName) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error(`Pass an absolute file path to ${functionName}.`);
  }
}

export function parseSetCookie(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  if (raw.length) {
    return raw.map((cookie) => cookie.split(";")[0]).join("; ");
  }
  const combined = headers.get("set-cookie");
  return combined ? combined.split(/,(?=[^;,]+=)/).map((cookie) => cookie.split(";")[0]).join("; ") : "";
}

export function mergeCookies(...cookieStrings) {
  const jar = new Map();
  for (const cookieString of cookieStrings) {
    for (const part of String(cookieString || "").split(";")) {
      const trimmed = part.trim();
      if (!trimmed || !trimmed.includes("=")) continue;
      const [name, ...rest] = trimmed.split("=");
      jar.set(name, rest.join("="));
    }
  }
  return Array.from(jar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}
