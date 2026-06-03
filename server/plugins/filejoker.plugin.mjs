import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

export const id = 'filejoker';
export const label = 'FileJoker';
export const credentialFields = ['cookie', 'email', 'username', 'password'];

function absolutePathRequired(filePath, functionName) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error(`Pass an absolute file path to ${functionName}.`);
  }
}

function contentTypeFor(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  return 'application/octet-stream';
}

function parseSetCookie(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  if (raw.length) return raw.map((cookie) => cookie.split(';')[0]).join('; ');
  const combined = headers.get('set-cookie');
  return combined
    ? combined.split(/,(?=[^;,]+=)/).map((cookie) => cookie.split(';')[0]).join('; ')
    : '';
}

function clean(value) {
  return String(value || '').trim();
}

function decodeEntities(value) {
  return clean(value)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function absoluteUrl(value, base) {
  return new URL(value, base).toString();
}

async function multipartStreamBody(fields, file) {
  const boundary = `----hostpost-${randomUUID()}`;
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
    `Content-Type: ${file.contentType || 'application/octet-stream'}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;
  const prefix = encoder.encode(fieldParts.join('') + fileHeader);
  const suffix = encoder.encode(fileFooter);
  const contentLength = prefix.byteLength + fileInfo.size + suffix.byteLength;

  async function* body() {
    yield prefix;
    file.onProgress?.({ loaded: 0, total: fileInfo.size, percent: 0 });
    let loaded = 0;
    let lastPercent = -1;
    for await (const chunk of createReadStream(file.path)) {
      loaded += chunk.byteLength;
      const percent =
        fileInfo.size > 0 ? Math.min(100, Math.round((loaded / fileInfo.size) * 100)) : 100;
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
    body: body(),
    contentLength,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function login({ email, username, password }) {
  const loginName = email || username;
  if (!loginName || !password) {
    throw new Error('FileJoker email/username and password are required.');
  }

  const response = await fetch('https://filejoker.net/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      op: 'login',
      redirect: '',
      email: loginName,
      password,
    }),
    redirect: 'manual',
  });

  const cookie = parseSetCookie(response.headers);
  if (!cookie) throw new Error('FileJoker login did not return a session cookie.');
  return { cookie };
}

async function discoverUploadForm({ cookie }) {
  const response = await fetch('https://filejoker.net/', {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const html = await response.text();
  const formMatch =
    html.match(/<form[^>]*id=["']ff_file["'][\s\S]*?<\/form>/i) ||
    html.match(/<form[\s\S]*?name=["']file_1["'][\s\S]*?<\/form>/i);
  const formHtml = formMatch?.[0] || html;
  const formAction = formHtml.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1];
  const field = (name) =>
    formHtml.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']+)["']`, 'i'))?.[1];
  const sessId = field('sess_id');
  const srvId = field('srv_id');
  const srvTmpUrl = field('srv_tmp_url');

  if (!formAction || !sessId || !srvId || !srvTmpUrl) {
    throw new Error('Could not discover FileJoker upload form. Check credentials.');
  }

  return {
    formAction: absoluteUrl(formAction, 'https://filejoker.net/'),
    sessId,
    srvId,
    srvTmpUrl,
  };
}

function parseUploadResult(html) {
  const outMatch = html.match(/<textarea[^>]*id=["']out["'][^>]*>([\s\S]*?)<\/textarea>/i);
  const output = decodeEntities(outMatch?.[1] || '');
  const plainText = output.match(/https?:\/\/filejoker\.net\/[^\s<\]]+/i)?.[0] || '';
  if (!plainText) {
    const hint =
      html.match(/(?:Files Uploaded|Error|Upload|Processing|Location|textarea|script|form)/i)?.[0] ||
      '';
    throw new Error(
      `FileJoker upload completed but no link was found. Hint: ${hint}; body: ${html.slice(0, 300).replace(/\s+/g, ' ')}`,
    );
  }
  return { plainText, output };
}

function parseRelay(html) {
  const action = html.match(/<form[^>]*action=['"]([^'"]+)['"][^>]*>/i)?.[1];
  const fields = {};
  for (const match of html.matchAll(
    /<input[^>]*name=['"]([^'"]+)['"][^>]*value=['"]([^'"]*)['"][^>]*>/gi,
  )) {
    fields[match[1]] = match[2];
  }
  if (!action || !fields.op || !fields.fn || !fields.st) return null;
  return { action, fields };
}

async function fetchRelayResult({ relay, cookie }) {
  const response = await fetch(relay.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { Cookie: cookie } : {}),
      Referer: 'https://filejoker.net/',
    },
    body: new URLSearchParams(relay.fields),
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`FileJoker result fetch failed with ${response.status}: ${html.slice(0, 500)}`);
  }
  return html;
}

export async function upload({ filePath, credentials = {}, onProgress }) {
  absolutePathRequired(filePath, 'filejoker.upload()');
  const cookie = credentials.cookie || (await login(credentials)).cookie;
  const spec = await discoverUploadForm({ cookie });

  const multipart = await multipartStreamBody(
    {
      upload_type: 'file',
      srv_id: spec.srvId,
      sess_id: spec.sessId,
      srv_tmp_url: spec.srvTmpUrl,
      tos: '1',
      submit_btn: 'Upload',
    },
    {
      fieldName: 'file_1',
      fileName: basename(filePath),
      contentType: contentTypeFor(filePath),
      path: filePath,
      onProgress,
    },
  );

  const response = await fetch(spec.formAction, {
    method: 'POST',
    headers: {
      'Content-Type': multipart.contentType,
      'Content-Length': String(multipart.contentLength),
      Cookie: cookie,
      Referer: 'https://filejoker.net/',
    },
    body: multipart.body,
    duplex: 'half',
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`FileJoker upload failed with ${response.status}: ${html.slice(0, 500)}`);
  }

  const relay = parseRelay(html);
  let parsed;
  if (relay) {
    try {
      parsed = parseUploadResult(await fetchRelayResult({ relay, cookie }));
    } catch (error) {
      if (relay.fields.st === 'OK' && relay.fields.fn) {
        parsed = {
          plainText: `https://filejoker.net/${relay.fields.fn}`,
          output: `https://filejoker.net/${relay.fields.fn}`,
        };
      } else {
        throw error;
      }
    }
  } else {
    parsed = parseUploadResult(html);
  }

  return {
    host: id,
    link: parsed.plainText,
    plainText: parsed.plainText,
    raw: { status: response.status, output: parsed.output },
  };
}

export default { id, label, credentialFields, upload };
