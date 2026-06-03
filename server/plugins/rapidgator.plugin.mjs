import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

export const id = 'rapidgator';
export const label = 'Rapidgator';
export const credentialFields = [
  'token',
  'username',
  'password',
  'twoFactorCode',
  'folderId',
];

const API_BASE_URL = 'https://rapidgator.net/api/v2';
const DEFAULT_TIMEOUT_MS = 180000;

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

function redactAuth(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(
    JSON.stringify(value, (key, val) => {
      return /token|password|login|email|auth/i.test(key) ? '<redacted>' : val;
    }),
  );
}

async function apiRequest(endpoint, params, { method = 'GET' } = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  const body = new URLSearchParams(params);
  let response;

  if (method === 'POST') {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } else {
    url.search = body.toString();
    response = await fetch(url);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Rapidgator ${endpoint} returned non-JSON response: ${text.slice(0, 500)}`);
  }
  if (!response.ok || data.status !== 200) {
    throw new Error(`Rapidgator ${endpoint} failed: ${JSON.stringify(redactAuth(data))}`);
  }
  return data.response;
}

async function md5File(filePath) {
  const hash = createHash('md5');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
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

export async function login({ username, password, twoFactorCode }) {
  if (!username || !password) throw new Error('Rapidgator username/password missing.');
  const response = await apiRequest(
    '/user/login',
    {
      login: username,
      password,
      ...(twoFactorCode ? { code: twoFactorCode } : {}),
    },
    { method: 'POST' },
  );
  if (!response.token) {
    throw new Error(
      `Rapidgator login did not return token: ${JSON.stringify(redactAuth(response))}`,
    );
  }
  return { token: response.token, user: redactAuth(response.user || {}) };
}

async function resolveToken(credentials) {
  if (credentials.token) return credentials.token;
  return (await login(credentials)).token;
}

async function initUpload({ token, filePath, folderId }) {
  const fileInfo = await stat(filePath);
  const response = await apiRequest(
    '/file/upload',
    {
      token,
      name: basename(filePath),
      hash: await md5File(filePath),
      size: String(fileInfo.size),
      ...(folderId ? { folder_id: folderId } : {}),
    },
    { method: 'POST' },
  );
  if (!response.upload?.upload_id || (!response.upload?.url && !response.upload?.file?.url)) {
    throw new Error(
      `Rapidgator upload init did not return upload target: ${JSON.stringify(redactAuth(response))}`,
    );
  }
  return response.upload;
}

async function getUploadInfo({ token, uploadId }) {
  return apiRequest('/file/upload_info', { token, upload_id: uploadId });
}

export async function upload({ filePath, credentials = {}, onProgress }) {
  absolutePathRequired(filePath, 'rapidgator.upload()');
  const token = await resolveToken(credentials);
  const uploadSpec = await initUpload({ token, filePath, folderId: credentials.folderId });

  if (uploadSpec.file?.url) {
    return {
      host: id,
      link: uploadSpec.file.url,
      plainText: uploadSpec.file.url,
      fileId: uploadSpec.file.file_id,
      uploadId: uploadSpec.upload_id,
      raw: redactAuth(uploadSpec),
    };
  }

  const multipart = await multipartStreamBody(
    {},
    {
      fieldName: 'file',
      fileName: basename(filePath),
      path: filePath,
      contentType: contentTypeFor(filePath),
      onProgress,
    },
  );

  const uploadResponse = await fetch(uploadSpec.url, {
    method: 'POST',
    headers: {
      'Content-Type': multipart.contentType,
      'Content-Length': String(multipart.contentLength),
    },
    body: multipart.body,
    duplex: 'half',
  });

  const uploadText = await uploadResponse.text();
  let uploadData;
  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    throw new Error(
      `Rapidgator upload target returned non-JSON response: ${uploadText.slice(0, 500)}`,
    );
  }
  if (!uploadResponse.ok || uploadData.status !== 200) {
    throw new Error(
      `Rapidgator upload target failed: ${JSON.stringify(redactAuth(uploadData))}`,
    );
  }

  const started = Date.now();
  const timeoutMs = credentials.timeoutMs || DEFAULT_TIMEOUT_MS;
  let info = null;
  while (Date.now() - started < timeoutMs) {
    info = await getUploadInfo({ token, uploadId: uploadSpec.upload_id });
    if (info?.file?.url) {
      return {
        host: id,
        link: info.file.url,
        plainText: info.file.url,
        fileId: info.file.file_id,
        uploadId: uploadSpec.upload_id,
        raw: redactAuth(info),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for Rapidgator upload result: ${JSON.stringify(redactAuth(info))}`,
  );
}

export default { id, label, credentialFields, upload };
