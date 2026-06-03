/**
 * Typed client for the Host Post Builder backend (`backend/server.mjs`).
 *
 * In dev, requests go to a relative `/api/*` path which Vite proxies to the
 * backend (see `vite.config.ts`). In production the React build is served by
 * the same origin as the backend, so relative paths also work. Override with
 * `VITE_API_BASE` if the backend runs elsewhere.
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export interface HostCredentials {
  keep2share?: { accessToken?: string; username?: string; password?: string };
  imagetwist?: { username?: string; password?: string };
  filejoker?: { email?: string; password?: string };
  rapidgator?: { username?: string; password?: string };
}

export interface MtnSettings {
  columns: number;
  rows: number;
  width: number;
  quality: number;
  backgroundColor: string;
}

export interface AppSettings {
  credentials?: HostCredentials;
  mtn?: Partial<MtnSettings>;
  [key: string]: unknown;
}

export type ProgressStatus = "running" | "done" | "error";

export type ProgressEvent =
  | {
      type: "step";
      step: "queued" | "prepared" | "mediainfo" | "thumbnail" | "complete" | "error";
      status?: ProgressStatus;
      percent?: number;
      error?: string;
    }
  | { type: "image"; status?: ProgressStatus; percent?: number }
  | { type: "file"; host: string; status?: ProgressStatus; percent?: number };

export interface ProcessRequest {
  /** Absolute path to a video already on the backend host. */
  sourcePath: string;
  title: string;
  imageHost: string;
  /** Backend file-host keys, e.g. ["keep2share","fileboom",...]. */
  fileHosts: string[];
  credentials?: HostCredentials;
  jobId?: string;
}

export interface ProcessResponse {
  ok: boolean;
  post?: string;
  job?: { id: string; [key: string]: unknown };
  media?: unknown;
  imageBbcode?: string;
  fileResults?: unknown;
  progress?: ProgressEvent[];
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export function getSettings(): Promise<{ ok: boolean; settings: AppSettings }> {
  return request("/api/settings");
}

export function saveSettings(
  settings: AppSettings
): Promise<{ ok: boolean; settings: AppSettings }> {
  return request("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
}

export function processJob(req: ProcessRequest): Promise<ProcessResponse> {
  return request("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

/** Upload a local video file via multipart (browser File). */
export function processJobUpload(form: {
  video: File;
  title: string;
  imageHost: string;
  fileHosts: string[];
  credentials?: HostCredentials;
  jobId?: string;
}): Promise<ProcessResponse> {
  const body = new FormData();
  body.append("video", form.video);
  body.append("title", form.title);
  body.append("imageHost", form.imageHost);
  body.append("fileHosts", form.fileHosts.join(","));
  body.append("credentials", JSON.stringify(form.credentials ?? {}));
  if (form.jobId) body.append("jobId", form.jobId);
  return request("/api/process", { method: "POST", body });
}

export function getProgress(
  jobId: string
): Promise<{ ok: boolean; progress: ProgressEvent[] }> {
  return request(`/api/progress?jobId=${encodeURIComponent(jobId)}`);
}
