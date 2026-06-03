import { basename } from "node:path";
import { absolutePathRequired, contentTypeFor, multipartStreamBody } from "./direct-http-helpers.mjs";

const PROVIDERS = {
  keep2share: {
    apiBaseUrl: "https://keep2share.cc/api/v2",
    linkHostPattern: /https?:\/\/(?:k2s\.cc|keep2share\.cc)\/[^\s\]]+/i,
  },
  fileboom: {
    apiBaseUrl: "https://fboom.me/api/v2",
    linkHostPattern: /https?:\/\/(?:fboom\.me|fileboom\.me)\/[^\s\]]+/i,
  },
};
const DEFAULT_PARENT_ID = "/";

function authBody({ accessToken, authToken, parentId = DEFAULT_PARENT_ID }) {
  if (accessToken) {
    return { access_token: accessToken, parent_id: parentId };
  }
  if (authToken) {
    return { auth_token: authToken, parent_id: parentId };
  }
  throw new Error("Pass accessToken or authToken to uploadKeep2Share().");
}

function normalizeAuth({ accessToken, authToken }) {
  if (accessToken) {
    return { accessToken };
  }
  if (authToken) {
    return { authToken };
  }
  return null;
}

function providerConfig(provider = "keep2share") {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown Keep2Share-family provider: ${provider}`);
  }
  return config;
}

async function postJson(provider, endpoint, body) {
  const config = providerConfig(provider);
  const response = await fetch(`${config.apiBaseUrl}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Keep2Share ${endpoint} returned non-JSON response: ${text.slice(0, 500)}`);
  }

  if (!response.ok || data.status === "error") {
    throw new Error(`Keep2Share ${endpoint} failed: ${JSON.stringify(redactAuth(data))}`);
  }

  return data;
}

function redactAuth(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  return JSON.parse(JSON.stringify(value, (key, val) => {
    return /token|auth|signature|password/i.test(key) ? "<redacted>" : val;
  }));
}

function normalizeLink(link) {
  if (!link) {
    return "";
  }
  return String(link).replace(/^http:\/\//i, "https://");
}

export async function getKeep2ShareUploadFormData({
  accessToken,
  authToken,
  parentId = DEFAULT_PARENT_ID,
  provider = "keep2share",
}) {
  const data = await postJson(provider, "getUploadFormData", authBody({ accessToken, authToken, parentId }));

  if (!data.form_action || !data.file_field || !data.form_data) {
    throw new Error(`Unexpected Keep2Share upload form response: ${JSON.stringify(redactAuth(data))}`);
  }

  return data;
}

export async function loginKeep2Share({ username, password, recaptchaResponse, provider = "keep2share" }) {
  if (!username || !password) {
    throw new Error("Pass username and password to loginKeep2Share().");
  }

  const body = {
    username,
    password,
  };

  if (recaptchaResponse) {
    body.recaptcha_response = recaptchaResponse;
  }

  const data = await postJson(provider, "login", body);
  const authToken = data.auth_token || data.token;

  if (!authToken) {
    throw new Error(`Keep2Share login did not return an auth token: ${JSON.stringify(redactAuth(data))}`);
  }

  return {
    authToken,
    raw: redactAuth(data),
  };
}

export async function uploadKeep2Share({
  accessToken,
  authToken,
  username,
  password,
  recaptchaResponse,
  filePath,
  parentId = DEFAULT_PARENT_ID,
  provider = "keep2share",
  onProgress,
}) {
  absolutePathRequired(filePath, "uploadKeep2Share()");

  let auth = normalizeAuth({ accessToken, authToken });
  if (!auth && username && password) {
    auth = await loginKeep2Share({ username, password, recaptchaResponse, provider });
  }
  if (!auth) {
    throw new Error("Pass accessToken, authToken, or username/password to uploadKeep2Share().");
  }

  const formSpec = await getKeep2ShareUploadFormData({ ...auth, parentId, provider });
  const fileField = formSpec.file_field;
  const fileName = basename(filePath);
  const multipart = await multipartStreamBody({
    ajax: String(formSpec.form_data.ajax),
    signature: String(formSpec.form_data.signature),
    params: String(formSpec.form_data.params),
  }, {
    fieldName: fileField,
    fileName,
    path: filePath,
    contentType: contentTypeFor(filePath),
    onProgress,
  });

  const uploadResponse = await fetch(formSpec.form_action, {
    method: "POST",
    headers: {
      "Content-Type": multipart.contentType,
      "Content-Length": String(multipart.contentLength),
    },
    body: multipart.body,
    duplex: "half",
  });

  const text = await uploadResponse.text();
  let uploadData;
  try {
    uploadData = JSON.parse(text);
  } catch {
    throw new Error(`Keep2Share upload returned non-JSON response: ${text.slice(0, 500)}`);
  }

  if (!uploadResponse.ok || uploadData.status === "error" || uploadData.success === false) {
    throw new Error(`Keep2Share upload failed: ${JSON.stringify(redactAuth(uploadData))}`);
  }

  const plainText = normalizeLink(uploadData.link);
  if (!plainText) {
    throw new Error(`Keep2Share upload did not return a link: ${JSON.stringify(redactAuth(uploadData))}`);
  }

  return {
    plainText,
    link: plainText,
    provider,
    userFileId: uploadData.user_file_id || uploadData.file_id || "",
    raw: redactAuth(uploadData),
  };
}

export async function uploadFileBoom(options) {
  return uploadKeep2Share({
    ...options,
    provider: "fileboom",
  });
}
