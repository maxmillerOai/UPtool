import type { HostConfig, UploadResult } from '@/types';
import { getByPath } from './dotpath';

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0..100 */
  percent: number;
  /** bytes per second (smoothed) */
  speed: number;
  /** estimated seconds remaining */
  eta: number;
}

export interface UploadCallbacks {
  onProgress?: (p: UploadProgress) => void;
  onProcessing?: () => void;
}

export interface UploadHandle {
  promise: Promise<UploadResult>;
  abort: () => void;
}

class HostError extends Error {}

/** Validates a file against a host's constraints before any transfer begins. */
export function validateFile(file: File, host: HostConfig): string | null {
  if (host.maxFileSize && host.maxFileSize > 0 && file.size > host.maxFileSize) {
    return `Exceeds ${host.name} limit`;
  }
  if (host.accept && host.accept.length > 0) {
    const name = file.name.toLowerCase();
    const ok = host.accept.some((rule) => {
      const r = rule.trim().toLowerCase();
      if (r.endsWith('/*')) return file.type.startsWith(r.slice(0, -1));
      if (r.startsWith('.')) return name.endsWith(r);
      return file.type === r;
    });
    if (!ok) return `Type not accepted by ${host.name}`;
  }
  return null;
}

function parseResult(host: HostConfig, rawBody: string): UploadResult {
  const mapping = host.response ?? { type: 'json', urlPath: 'url' };
  if (mapping.type === 'text') {
    const url = (mapping.urlPrefix ?? '') + rawBody.trim();
    if (!url) throw new HostError('Empty response from host');
    return { url, raw: rawBody };
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new HostError('Host returned malformed JSON');
  }
  const url = getByPath(json, mapping.urlPath);
  if (typeof url !== 'string' || !url) {
    throw new HostError('Could not locate URL in host response');
  }
  const deleteUrl = mapping.deletePath ? getByPath(json, mapping.deletePath) : undefined;
  const thumbnailUrl = mapping.thumbnailPath
    ? getByPath(json, mapping.thumbnailPath)
    : undefined;
  return {
    url: (mapping.urlPrefix ?? '') + url,
    deleteUrl: typeof deleteUrl === 'string' ? deleteUrl : undefined,
    thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined,
    raw: json,
  };
}

/** Exponentially-smoothed speed/ETA estimator. */
function createMeter(total: number) {
  let lastTime = performance.now();
  let lastLoaded = 0;
  let smoothed = 0;
  return (loaded: number): { speed: number; eta: number } => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    if (dt > 0.05) {
      const inst = (loaded - lastLoaded) / dt;
      smoothed = smoothed === 0 ? inst : smoothed * 0.7 + inst * 0.3;
      lastTime = now;
      lastLoaded = loaded;
    }
    const remaining = Math.max(0, total - loaded);
    const eta = smoothed > 0 ? remaining / smoothed : 0;
    return { speed: Math.max(0, smoothed), eta };
  };
}

function realUpload(
  file: File,
  host: HostConfig,
  cb: UploadCallbacks,
  signal: { xhr: XMLHttpRequest | null },
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.xhr = xhr;
    const method = host.method ?? 'POST';
    xhr.open(method, host.endpoint, true);

    for (const [k, v] of Object.entries(host.headers ?? {})) {
      xhr.setRequestHeader(k, v);
    }

    const meter = createMeter(file.size);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const { speed, eta } = meter(e.loaded);
      cb.onProgress?.({
        loaded: e.loaded,
        total: e.total,
        percent: (e.loaded / e.total) * 100,
        speed,
        eta,
      });
    };

    xhr.upload.onload = () => cb.onProcessing?.();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(parseResult(host, xhr.responseText));
        } catch (err) {
          reject(err instanceof Error ? err : new HostError('Parse failure'));
        }
      } else {
        reject(new HostError(`Host responded ${xhr.status} ${xhr.statusText || ''}`.trim()));
      }
    };
    xhr.onerror = () => reject(new HostError('Network error during transfer'));
    xhr.ontimeout = () => reject(new HostError('Transfer timed out'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));

    if (method === 'PUT') {
      xhr.send(file);
    } else {
      const form = new FormData();
      for (const [k, v] of Object.entries(host.fields ?? {})) form.append(k, v);
      form.append(host.fileField ?? 'file', file, file.name);
      xhr.send(form);
    }
  });
}

function simulatedUpload(
  file: File,
  host: HostConfig,
  cb: UploadCallbacks,
  signal: { aborted: boolean; timer: number | null },
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const total = file.size;
    let loaded = 0;
    const meter = createMeter(total);
    // Simulated link speed: scale with size so big files take longer, capped.
    const baseSpeed = Math.min(60 * 1024 * 1024, Math.max(2 * 1024 * 1024, total / 4));
    const tick = () => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      // jittered increment to feel organic
      const jitter = 0.6 + Math.random() * 0.8;
      loaded = Math.min(total, loaded + (baseSpeed / 12) * jitter);
      const { speed, eta } = meter(loaded);
      cb.onProgress?.({ loaded, total, percent: (loaded / total) * 100, speed, eta });
      if (loaded >= total) {
        cb.onProcessing?.();
        signal.timer = window.setTimeout(() => {
          if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          // 8% simulated failure rate to exercise the retry system
          if (Math.random() < 0.08) {
            reject(new HostError('Uplink desync — checksum mismatch'));
            return;
          }
          resolve(buildSimulatedResult(file, host));
        }, 500 + Math.random() * 700);
        return;
      }
      signal.timer = window.setTimeout(tick, 80);
    };
    signal.timer = window.setTimeout(tick, 120);
  });
}

function buildSimulatedResult(file: File, host: HostConfig): UploadResult {
  const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const safeName = encodeURIComponent(file.name);
  const base = host.endpoint.replace('simulated://', 'https://cdn.');
  return {
    url: `${base}/${slug}/${safeName}`,
    deleteUrl: `${base}/${slug}/delete/${slug}`,
    raw: { simulated: true, host: host.id, slug },
  };
}

/**
 * Starts an upload and returns a handle with an abort function and a promise
 * that resolves with the parsed result. Transparently routes to a simulated
 * transfer when the host is configured as `simulated`.
 */
export function startUpload(
  file: File,
  host: HostConfig,
  cb: UploadCallbacks = {},
): UploadHandle {
  if (host.simulated) {
    const signal = { aborted: false, timer: null as number | null };
    const promise = simulatedUpload(file, host, cb, signal);
    return {
      promise,
      abort: () => {
        signal.aborted = true;
        if (signal.timer != null) window.clearTimeout(signal.timer);
      },
    };
  }
  const signal = { xhr: null as XMLHttpRequest | null };
  const promise = realUpload(file, host, cb, signal);
  return { promise, abort: () => signal.xhr?.abort() };
}
