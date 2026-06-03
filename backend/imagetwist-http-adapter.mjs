import { basename } from "node:path";
import { absolutePathRequired, contentTypeFor, multipartStreamBody } from "./direct-http-helpers.mjs";

function clean(value) {
  return String(value || "").trim();
}

export function parseImageTwistResult(html) {
  const textareaMatch = html.match(/<textarea[^>]*id=["']tl1["'][^>]*>([\s\S]*?)<\/textarea>/i);
  const inputMatch = html.match(/<input[^>]*id=["']l1-[^"']+["'][^>]*value=["']([^"']+)["'][^>]*>/i);
  const bbcode = clean(textareaMatch?.[1] || inputMatch?.[1])
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  if (!bbcode) {
    const hint = html.match(/(?:FILES UPLOADED|Generating links|Error|Upload|Location|url=|textarea|input)/i)?.[0] || "";
    throw new Error(`ImageTwist HTTP upload completed but no forum BBCode was found. Hint: ${hint}; body: ${html.slice(0, 300).replace(/\s+/g, " ")}`);
  }

  return { bbcode };
}

export async function uploadImageTwistHttp({
  filePath,
  formAction,
  sessId,
  cookie,
  thumbSize = "300x300",
  perRow = "1",
  sdomain = "imagetwist.com",
  fldId = "0",
  utype = "reg",
  onProgress,
}) {
  absolutePathRequired(filePath, "uploadImageTwistHttp()");
  if (!formAction || !sessId) {
    throw new Error("Pass formAction and sessId to uploadImageTwistHttp().");
  }

  const uploadId = String(Math.floor(Math.random() * 1_000_000_000_000)).padStart(12, "0");
  const uploadUrl = new URL(formAction);
  uploadUrl.search = new URLSearchParams({
    upload_id: uploadId,
    js_on: "1",
    utype,
    upload_type: "file",
  }).toString();
  const multipart = await multipartStreamBody(
    {
      upload_type: "file",
      sess_id: sessId,
      thumb_size: thumbSize,
      per_row: perRow,
      sdomain,
      fld_id: fldId,
      tos: "1",
      submit_btn: "Upload",
    },
    {
      fieldName: "file_0",
      fileName: basename(filePath),
      contentType: contentTypeFor(filePath),
      path: filePath,
      onProgress,
    },
  );

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: "https://imagetwist.com/",
    },
    body: multipart.body,
    duplex: "half",
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`ImageTwist HTTP upload failed with ${response.status}: ${html.slice(0, 500)}`);
  }

  const relay = parseImageTwistRelay(html);
  if (relay) {
    const resultHtml = await fetchImageTwistResult({ relay, cookie });
    return {
      ...parseImageTwistResult(resultHtml),
      status: response.status,
    };
  }

  return {
    ...parseImageTwistResult(html),
    status: response.status,
  };
}

function parseImageTwistRelay(html) {
  const action = html.match(/<form[^>]*action=['"]([^'"]+)['"][^>]*>/i)?.[1];
  const fields = {};
  for (const match of html.matchAll(/<(?:input|textarea)[^>]*name=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/textarea>|<input[^>]*name=['"]([^'"]+)['"][^>]*value=['"]([^'"]*)['"][^>]*>/gi)) {
    const name = match[1] || match[3];
    const value = match[2] || match[4] || "";
    fields[name] = value.trim();
  }
  if (!action || !fields.op || !fields.fn || !fields.st) {
    return null;
  }
  return { action, fields };
}

async function fetchImageTwistResult({ relay, cookie }) {
  const response = await fetch(relay.action, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: "https://imagetwist.com/",
    },
    body: new URLSearchParams(relay.fields),
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`ImageTwist result fetch failed with ${response.status}: ${html.slice(0, 500)}`);
  }
  return html;
}

export async function uploadImageTwistHtml5Http({
  filePath,
  uploadUrl,
  sessId,
  cookie,
  onProgress,
}) {
  absolutePathRequired(filePath, "uploadImageTwistHtml5Http()");
  if (!uploadUrl || !sessId) {
    throw new Error("Pass uploadUrl and sessId to uploadImageTwistHtml5Http().");
  }

  const fieldName = `file_${Date.now()}`;
  const multipart = await multipartStreamBody(
    { sess_id: sessId },
    {
      fieldName,
      fileName: basename(filePath),
      contentType: contentTypeFor(filePath),
      path: filePath,
      onProgress,
    },
  );

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: "https://imagetwist.com/",
    },
    body: multipart.body,
    duplex: "half",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ImageTwist HTML5 HTTP upload failed with ${response.status}: ${text.slice(0, 500)}`);
  }

  return {
    raw: text.trim(),
    status: response.status,
  };
}
