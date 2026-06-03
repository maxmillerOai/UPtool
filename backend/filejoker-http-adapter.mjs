import { basename } from "node:path";
import { absolutePathRequired, contentTypeFor, multipartStreamBody } from "./direct-http-helpers.mjs";

function clean(value) {
  return String(value || "").trim();
}

function decodeEntities(value) {
  return clean(value)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseFileJokerResult(html) {
  const outMatch = html.match(/<textarea[^>]*id=["']out["'][^>]*>([\s\S]*?)<\/textarea>/i);
  const output = decodeEntities(outMatch?.[1] || "");
  const plainText = output.match(/https?:\/\/filejoker\.net\/[^\s<\]]+/i)?.[0] || "";

  if (!plainText) {
    const hint = html.match(/(?:Files Uploaded|Error|Upload|Processing|Location|textarea|script|form)/i)?.[0] || "";
    throw new Error(`FileJoker HTTP upload completed but no plain link was found. Hint: ${hint}; body: ${html.slice(0, 300).replace(/\s+/g, " ")}`);
  }

  return {
    plainText,
    fileUrl: plainText,
    output,
  };
}

export async function uploadFileJokerHttp({
  filePath,
  formAction,
  sessId,
  srvId,
  srvTmpUrl,
  cookie,
  onProgress,
}) {
  absolutePathRequired(filePath, "uploadFileJokerHttp()");
  if (!formAction || !sessId || !srvId || !srvTmpUrl) {
    throw new Error("Pass formAction, sessId, srvId, and srvTmpUrl to uploadFileJokerHttp().");
  }

  const multipart = await multipartStreamBody(
    {
      upload_type: "file",
      srv_id: srvId,
      sess_id: sessId,
      srv_tmp_url: srvTmpUrl,
      tos: "1",
      submit_btn: "Upload",
    },
    {
      fieldName: "file_1",
      fileName: basename(filePath),
      contentType: contentTypeFor(filePath),
      path: filePath,
      onProgress,
    },
  );

  const response = await fetch(formAction, {
    method: "POST",
    headers: {
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: "https://filejoker.net/",
    },
    body: multipart.body,
    duplex: "half",
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`FileJoker HTTP upload failed with ${response.status}: ${html.slice(0, 500)}`);
  }

  const relay = parseFileJokerRelay(html);
  if (relay) {
    const resultHtml = await fetchFileJokerResult({ relay, cookie });
    try {
      return {
        ...parseFileJokerResult(resultHtml),
        status: response.status,
      };
    } catch (error) {
      if (relay.fields.st === "OK" && relay.fields.fn) {
        const plainText = `https://filejoker.net/${relay.fields.fn}`;
        return {
          plainText,
          fileUrl: plainText,
          output: plainText,
          status: response.status,
        };
      }
      throw error;
    }
  }

  return {
    ...parseFileJokerResult(html),
    status: response.status,
  };
}

function parseFileJokerRelay(html) {
  const action = html.match(/<form[^>]*action=['"]([^'"]+)['"][^>]*>/i)?.[1];
  const fields = {};
  for (const match of html.matchAll(/<input[^>]*name=['"]([^'"]+)['"][^>]*value=['"]([^'"]*)['"][^>]*>/gi)) {
    fields[match[1]] = match[2];
  }
  if (!action || !fields.op || !fields.fn || !fields.st) {
    return null;
  }
  return { action, fields };
}

async function fetchFileJokerResult({ relay, cookie }) {
  const body = new URLSearchParams(relay.fields);
  const response = await fetch(relay.action, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: "https://filejoker.net/",
    },
    body,
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`FileJoker result fetch failed with ${response.status}: ${html.slice(0, 500)}`);
  }
  return html;
}
