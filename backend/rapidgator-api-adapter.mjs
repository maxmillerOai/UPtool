import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import { multipartStreamBody, contentTypeFor } from "./direct-http-helpers.mjs";

const API_BASE_URL = "https://rapidgator.net/api/v2";
const DEFAULT_TIMEOUT_MS = 180000;

function assertAbsolutePath(filePath) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error("Pass an absolute file path to uploadRapidgator().");
  }
}

function redactAuth(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  return JSON.parse(JSON.stringify(value, (key, val) => {
    return /token|password|login|email|auth/i.test(key) ? "<redacted>" : val;
  }));
}

async function apiRequest(endpoint, params, { method = "GET" } = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  const body = new URLSearchParams(params);

  let response;
  if (method === "POST") {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
  const hash = createHash("md5");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function resolveToken({ token, username, password, twoFactorCode }) {
  if (token) {
    return token;
  }
  const login = await loginRapidgator({ username, password, twoFactorCode });
  return login.token;
}

export async function loginRapidgator({ username, password, twoFactorCode }) {
  if (!username || !password) {
    throw new Error("Pass username and password to loginRapidgator().");
  }

  const response = await apiRequest(
    "/user/login",
    {
      login: username,
      password,
      ...(twoFactorCode ? { code: twoFactorCode } : {}),
    },
    { method: "POST" },
  );

  if (!response.token) {
    throw new Error(`Rapidgator login did not return a token: ${JSON.stringify(redactAuth(response))}`);
  }

  return {
    token: response.token,
    user: redactAuth(response.user || {}),
  };
}

export async function initRapidgatorUpload({ token, filePath, folderId }) {
  assertAbsolutePath(filePath);
  const fileInfo = await stat(filePath);
  const response = await apiRequest(
    "/file/upload",
    {
      token,
      name: basename(filePath),
      hash: await md5File(filePath),
      size: String(fileInfo.size),
      ...(folderId ? { folder_id: folderId } : {}),
    },
    { method: "POST" },
  );

  if (!response.upload?.upload_id || (!response.upload?.url && !response.upload?.file?.url)) {
    throw new Error(`Rapidgator upload init did not return upload target: ${JSON.stringify(redactAuth(response))}`);
  }

  return {
    upload: response.upload,
  };
}

export async function getRapidgatorUploadInfo({ token, uploadId }) {
  const response = await apiRequest("/file/upload_info", { token, upload_id: uploadId });
  return response.upload;
}

export async function uploadRapidgator({
  token,
  username,
  password,
  twoFactorCode,
  filePath,
  folderId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onProgress,
}) {
  assertAbsolutePath(filePath);
  const resolvedToken = await resolveToken({ token, username, password, twoFactorCode });
  const { upload } = await initRapidgatorUpload({ token: resolvedToken, filePath, folderId });

  if (upload.file?.url) {
    return {
      plainText: upload.file.url,
      link: upload.file.url,
      fileId: upload.file.file_id,
      uploadId: upload.upload_id,
      raw: redactAuth(upload),
    };
  }

  const multipart = await multipartStreamBody({}, {
    fieldName: "file",
    fileName: basename(filePath),
    path: filePath,
    contentType: contentTypeFor(filePath),
    onProgress,
  });

  const uploadResponse = await fetch(upload.url, {
    method: "POST",
    headers: {
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
    },
    body: multipart.body,
    duplex: "half",
  });
  const uploadText = await uploadResponse.text();
  let uploadData;
  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    throw new Error(`Rapidgator upload target returned non-JSON response: ${uploadText.slice(0, 500)}`);
  }

  if (!uploadResponse.ok || uploadData.status !== 200) {
    throw new Error(`Rapidgator upload target failed: ${JSON.stringify(redactAuth(uploadData))}`);
  }

  const started = Date.now();
  let info = null;
  while (Date.now() - started < timeoutMs) {
    info = await getRapidgatorUploadInfo({ token: resolvedToken, uploadId: upload.upload_id });
    if (info?.file?.url) {
      return {
        plainText: info.file.url,
        link: info.file.url,
        fileId: info.file.file_id,
        uploadId: upload.upload_id,
        raw: redactAuth(info),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for Rapidgator upload result: ${JSON.stringify(redactAuth(info))}`);
}
