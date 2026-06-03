import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename } from 'node:path';

export const id = 'keep2share';
export const label = 'Keep2Share';
export const credentialFields = [
  'accessToken',
  'authToken',
  'username',
  'password',
  'recaptchaResponse',
  'parentId',
];

const API_BASE_URL = 'https://keep2share.cc/api/v2';
const DEFAULT_PARENT_ID = '/';

function absolutePathRequired(filePath, functionName) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error(`Pass an absolute file path to ${functionName}.`);
  }
}

function contentTypeFor(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  return 'application/octet-stream';
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

function redactAuth(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(
    JSON.stringify(value, (key, val) => {
      return /token|auth|signature|password/i.test(key) ? '<redacted>' : val;
    }),
  );
}

function authBody({ accessToken, authToken, parentId = DEFAULT_PARENT_ID }) {
  if (accessToken) return { access_token: accessToken, parent_id: parentId };
  if (authToken) return { auth_token: authToken, parent_id: parentId };
  throw new Error('Pass accessToken or authToken.');
}

async function postJson(endpoint, body) {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Keep2Share ${endpoint} returned non-JSON response: ${text.slice(0, 500)}`);
  }
  if (!response.ok || data.status === 'error') {
    throw new Error(`Keep2Share ${endpoint} failed: ${JSON.stringify(redactAuth(data))}`);
  }
  return data;
}

export async function login({ username, password, recaptchaResponse }) {
  if (!username || !password) throw new Error('Keep2Share username/password missing.');
  const data = await postJson('login', {
    username,
    password,
    ...(recaptchaResponse ? { recaptcha_response: recaptchaResponse } : {}),
  });
  const authToken = data.auth_token || data.token;
  if (!authToken) {
    throw new Error(`Keep2Share login did not return token: ${JSON.stringify(redactAuth(data))}`);
  }
  return { authToken, raw: redactAuth(data) };
}

async function getUploadFormData({ accessToken, authToken, parentId = DEFAULT_PARENT_ID }) {
  const data = await postJson('getUploadFormData', authBody({ accessToken, authToken, parentId }));
  if (!data.form_action || !data.file_field || !data.form_data) {
    throw new Error(
      `Unexpected Keep2Share upload form response: ${JSON.stringify(redactAuth(data))}`,
    );
  }
  return data;
}

export async function upload({ filePath, credentials = {}, onProgress }) {
  absolutePathRequired(filePath, 'keep2share.upload()');

  let accessToken = credentials.accessToken;
  let authToken = credentials.authToken;
  if (!accessToken && !authToken && credentials.username && credentials.password) {
    authToken = (await login(credentials)).authToken;
  }
  if (!accessToken && !authToken) {
    throw new Error('Keep2Share requires accessToken, authToken, or username/password.');
  }

  const formSpec = await getUploadFormData({
    accessToken,
    authToken,
    parentId: credentials.parentId || DEFAULT_PARENT_ID,
  });

  const multipart = await multipartStreamBody(
    {
      ajax: String(formSpec.form_data.ajax),
      signature: String(formSpec.form_data.signature),
      params: String(formSpec.form_data.params),
    },
    {
      fieldName: formSpec.file_field,
      fileName: basename(filePath),
      path: filePath,
      contentType: contentTypeFor(filePath),
      onProgress,
    },
  );

  const response = await fetch(formSpec.form_action, {
    method: 'POST',
    headers: {
      'Content-Type': multipart.contentType,
      'Content-Length': String(multipart.contentLength),
    },
    body: multipart.body,
    duplex: 'half',
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Keep2Share upload returned non-JSON response: ${text.slice(0, 500)}`);
  }
  if (!response.ok || data.status === 'error' || data.success === false) {
    throw new Error(`Keep2Share upload failed: ${JSON.stringify(redactAuth(data))}`);
  }

  const plainText = String(data.link || '').replace(/^http:\/\//i, 'https://');
  if (!plainText) {
    throw new Error(`Keep2Share upload did not return link: ${JSON.stringify(redactAuth(data))}`);
  }

  return {
    host: id,
    link: plainText,
    plainText,
    fileId: data.user_file_id || data.file_id || '',
    raw: redactAuth(data),
  };
}

export default { id, label, credentialFields, upload };
