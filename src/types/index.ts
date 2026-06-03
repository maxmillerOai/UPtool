/**
 * Core domain types for UPtool.
 * These are intentionally framework-agnostic so the upload engine and host
 * configuration layer can be reused outside of React if ever needed.
 */

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/**
 * Strategy used to extract the final public URL (and optional delete URL) from
 * a host response. Configured per-host so new hosts need no code changes.
 */
export interface HostResponseMapping {
  /** Treat the raw response body as the URL itself (text endpoints). */
  type: 'text' | 'json';
  /** Dot-path into a JSON body, e.g. "data.url" or "files.0.url". */
  urlPath?: string;
  /** Optional dot-path to a delete URL/token. */
  deletePath?: string;
  /** Optional dot-path to a thumbnail URL. */
  thumbnailPath?: string;
  /** Prefix prepended to a relative URL returned by the host. */
  urlPrefix?: string;
}

/**
 * Declarative host definition. Everything required to talk to an upload host is
 * expressed as data here — the application never hard-codes a host.
 */
/**
 * How an upload is performed:
 *  - 'direct'  : the browser uploads straight to `endpoint` (or simulated).
 *  - 'plugin'  : the upload is routed through the backend plugin bridge, which
 *                runs a server-side filehost plugin (e.g. Rapidgator). Required
 *                for authenticated/multi-step host APIs that can't run in a
 *                browser.
 */
export type HostKind = 'direct' | 'plugin';

export interface HostConfig {
  id: string;
  name: string;
  description?: string;
  /** Short tag shown in the UI, e.g. "EU-WEST" or "QUANTUM". */
  region?: string;
  /** Transport used for uploads. Defaults to 'direct'. */
  kind?: HostKind;
  /** For kind='plugin': the backend plugin id to route through. */
  pluginId?: string;
  /** For kind='plugin': credential field names the host expects. */
  credentialFields?: string[];
  /** Upload endpoint URL (direct hosts). */
  endpoint: string;
  method?: 'POST' | 'PUT';
  /** multipart form field name that carries the file. */
  fileField?: string;
  /** Extra multipart fields sent with every request. */
  fields?: Record<string, string>;
  /** Static headers (e.g. authorization). */
  headers?: Record<string, string>;
  /** Maximum accepted file size in bytes (0 / undefined = unlimited). */
  maxFileSize?: number;
  /** Accepted mime types or extensions (".png", "image/*"). Empty = any. */
  accept?: string[];
  /** How to read the response to find the resulting URL. */
  response?: HostResponseMapping;
  /** When true the host is simulated locally (no network call). */
  simulated?: boolean;
  /** Whether the host can currently receive uploads. */
  enabled?: boolean;
  /** Accent color used for host-specific theming in the UI. */
  accent?: string;
  /** Marks a host defined in source config (cannot be deleted, only disabled). */
  builtin?: boolean;
}

export interface UploadResult {
  url: string;
  deleteUrl?: string;
  thumbnailUrl?: string;
  raw?: unknown;
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  hostId: string;
  status: UploadStatus;
  /** 0..100 */
  progress: number;
  /** bytes uploaded so far */
  loaded: number;
  /** instantaneous speed in bytes/sec */
  speed: number;
  /** estimated seconds remaining */
  eta: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: UploadResult;
  error?: string;
  attempts: number;
  /** local object URL for image previews */
  previewUrl?: string;
}

export type NotificationKind = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
}

export type ViewId =
  | 'dashboard'
  | 'upload'
  | 'history'
  | 'hosts'
  | 'stats'
  | 'settings';

export interface ThemePreset {
  id: string;
  name: string;
  /** Primary accent (HSL channel string "h s% l%"). */
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface Settings {
  themeId: string;
  defaultHostId: string;
  maxConcurrent: number;
  autoRetry: boolean;
  maxRetries: number;
  autoCopyOnComplete: boolean;
  soundEnabled: boolean;
  particlesEnabled: boolean;
  scanlinesEnabled: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
}

export interface StatsSnapshot {
  totalUploads: number;
  totalBytes: number;
  successCount: number;
  failureCount: number;
  byHost: Record<string, { count: number; bytes: number }>;
}
