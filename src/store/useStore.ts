import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppNotification,
  HostConfig,
  NotificationKind,
  Settings,
  StatsSnapshot,
  UploadItem,
  ViewId,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/config/app.config';
import { STORAGE_KEY } from '@/config/app.config';
import { mergeHosts, findHost } from '@/lib/hostRegistry';
import { startUpload, validateFile } from '@/lib/uploader';
import { uid } from '@/lib/id';
import { sfx } from '@/lib/sound';
import { fileRegistry, handleRegistry, disposeUpload } from './fileRegistry';

interface StoreState {
  activeView: ViewId;
  uploads: UploadItem[];
  userHosts: HostConfig[];
  settings: Settings;
  notifications: AppNotification[];
  search: string;

  // ── selectors (computed via helpers below) ──
  setView: (view: ViewId) => void;
  setSearch: (q: string) => void;

  // ── uploads ──
  addFiles: (files: File[], hostId?: string) => void;
  startQueued: () => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  reassignHost: (id: string, hostId: string) => void;

  // ── hosts ──
  upsertHost: (host: HostConfig) => void;
  deleteHost: (id: string) => void;
  toggleHost: (id: string, enabled: boolean) => void;

  // ── settings ──
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;

  // ── notifications ──
  notify: (kind: NotificationKind, title: string, message?: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

function getMergedHosts(state: { userHosts: HostConfig[] }): HostConfig[] {
  return mergeHosts(state.userHosts);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      // Drives the concurrency-limited queue. Called after any state change that
      // could free a slot or enqueue work.
      const pump = () => {
        const { uploads, settings } = get();
        const active = uploads.filter(
          (u) => u.status === 'uploading' || u.status === 'processing',
        ).length;
        let free = Math.max(0, settings.maxConcurrent - active);
        if (free <= 0) return;
        const hosts = getMergedHosts(get());
        for (const item of uploads) {
          if (free <= 0) break;
          if (item.status !== 'queued') continue;
          const host = findHost(hosts, item.hostId);
          if (!host) {
            patch(item.id, { status: 'failed', error: 'Host not found' });
            continue;
          }
          const file = fileRegistry.get(item.id);
          if (!file) {
            patch(item.id, { status: 'failed', error: 'File reference lost' });
            continue;
          }
          free--;
          run(item.id, file, host);
        }
      };

      const patch = (id: string, changes: Partial<UploadItem>) => {
        set((s) => ({
          uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...changes } : u)),
        }));
      };

      const run = (id: string, file: File, host: HostConfig) => {
        patch(id, {
          status: 'uploading',
          startedAt: Date.now(),
          error: undefined,
          progress: 0,
          loaded: 0,
        });
        const handle = startUpload(file, host, {
          onProgress: ({ loaded, percent, speed, eta }) => {
            patch(id, { loaded, progress: percent, speed, eta, status: 'uploading' });
          },
          onProcessing: () => patch(id, { status: 'processing', progress: 100, eta: 0 }),
        });
        handleRegistry.set(id, handle);

        handle.promise
          .then((result) => {
            const item = get().uploads.find((u) => u.id === id);
            patch(id, {
              status: 'completed',
              progress: 100,
              speed: 0,
              eta: 0,
              completedAt: Date.now(),
              result,
            });
            const s = get();
            if (s.settings.soundEnabled) sfx.success();
            s.notify('success', 'Transfer complete', `${item?.name ?? 'File'} → ${host.name}`);
            if (s.settings.autoCopyOnComplete && result.url) {
              void navigator.clipboard?.writeText(result.url).catch(() => undefined);
            }
            disposeUpload(id);
            pump();
          })
          .catch((err: unknown) => {
            const aborted = err instanceof DOMException && err.name === 'AbortError';
            if (aborted) {
              // cancelUpload already set the state; just free the slot.
              pump();
              return;
            }
            const message = err instanceof Error ? err.message : 'Unknown transfer error';
            const item = get().uploads.find((u) => u.id === id);
            const attempts = (item?.attempts ?? 0) + 1;
            const s = get();
            const canRetry = s.settings.autoRetry && attempts <= s.settings.maxRetries;
            patch(id, {
              status: canRetry ? 'queued' : 'failed',
              error: message,
              attempts,
              speed: 0,
              eta: 0,
            });
            if (canRetry) {
              s.notify('warning', 'Retrying transfer', `${item?.name ?? 'File'} · attempt ${attempts + 1}`);
            } else {
              if (s.settings.soundEnabled) sfx.error();
              s.notify('error', 'Transfer failed', `${item?.name ?? 'File'} · ${message}`);
            }
            handleRegistry.delete(id);
            pump();
          });
      };

      return {
        activeView: 'dashboard',
        uploads: [],
        userHosts: [],
        settings: { ...DEFAULT_SETTINGS },
        notifications: [],
        search: '',

        setView: (view) => set({ activeView: view }),
        setSearch: (q) => set({ search: q }),

        addFiles: (files, hostId) => {
          const state = get();
          const hosts = getMergedHosts(state);
          const targetId = hostId ?? state.settings.defaultHostId;
          const host = findHost(hosts, targetId) ?? hosts.find((h) => h.enabled !== false);
          if (!host) {
            state.notify('error', 'No host available', 'Add or enable a host first.');
            return;
          }
          const items: UploadItem[] = [];
          for (const file of files) {
            const id = uid('up');
            const error = validateFile(file, host);
            fileRegistry.set(id, file);
            const isImage = file.type.startsWith('image/');
            items.push({
              id,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              hostId: host.id,
              status: error ? 'failed' : 'queued',
              progress: 0,
              loaded: 0,
              speed: 0,
              eta: 0,
              createdAt: Date.now(),
              attempts: 0,
              error: error ?? undefined,
              previewUrl: isImage ? URL.createObjectURL(file) : undefined,
            });
          }
          set((s) => ({ uploads: [...items, ...s.uploads] }));
          if (state.settings.soundEnabled) sfx.start();
          const queued = items.filter((i) => i.status === 'queued').length;
          if (queued > 0) {
            state.notify('info', 'Queued for uplink', `${queued} file(s) → ${host.name}`);
          }
          pump();
        },

        startQueued: () => pump(),

        cancelUpload: (id) => {
          const handle = handleRegistry.get(id);
          handle?.abort();
          handleRegistry.delete(id);
          patch(id, { status: 'cancelled', speed: 0, eta: 0 });
          pump();
        },

        retryUpload: (id) => {
          const item = get().uploads.find((u) => u.id === id);
          if (!item) return;
          if (!fileRegistry.has(id)) {
            get().notify('error', 'Cannot retry', 'Original file reference is no longer available.');
            return;
          }
          patch(id, { status: 'queued', error: undefined, progress: 0, loaded: 0 });
          pump();
        },

        removeUpload: (id) => {
          const handle = handleRegistry.get(id);
          handle?.abort();
          const item = get().uploads.find((u) => u.id === id);
          if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
          disposeUpload(id);
          set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
        },

        clearCompleted: () => {
          const terminal = new Set(['completed', 'failed', 'cancelled']);
          for (const u of get().uploads) {
            if (terminal.has(u.status)) {
              if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
              disposeUpload(u.id);
            }
          }
          set((s) => ({ uploads: s.uploads.filter((u) => !terminal.has(u.status)) }));
        },

        clearAll: () => {
          for (const u of get().uploads) {
            handleRegistry.get(u.id)?.abort();
            if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
            disposeUpload(u.id);
          }
          set({ uploads: [] });
        },

        reassignHost: (id, hostId) => {
          const item = get().uploads.find((u) => u.id === id);
          if (!item || (item.status !== 'queued' && item.status !== 'failed')) return;
          patch(id, { hostId, status: 'queued', error: undefined });
          pump();
        },

        upsertHost: (host) => {
          set((s) => {
            const exists = s.userHosts.some((h) => h.id === host.id);
            return {
              userHosts: exists
                ? s.userHosts.map((h) => (h.id === host.id ? host : h))
                : [...s.userHosts, host],
            };
          });
          get().notify('success', 'Host saved', host.name);
        },

        deleteHost: (id) => {
          set((s) => ({ userHosts: s.userHosts.filter((h) => h.id !== id) }));
          get().notify('info', 'Host removed', id);
        },

        toggleHost: (id, enabled) => {
          const hosts = getMergedHosts(get());
          const base = findHost(hosts, id);
          if (!base) return;
          // Persist the override into userHosts so builtin toggles survive reload.
          set((s) => {
            const exists = s.userHosts.some((h) => h.id === id);
            return {
              userHosts: exists
                ? s.userHosts.map((h) => (h.id === id ? { ...h, enabled } : h))
                : [...s.userHosts, { ...base, enabled }],
            };
          });
        },

        updateSettings: (patchObj) =>
          set((s) => ({ settings: { ...s.settings, ...patchObj } })),

        resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

        notify: (kind, title, message) => {
          const s = get();
          if (!s.settings.notificationsEnabled && kind !== 'error') return;
          const n: AppNotification = {
            id: uid('ntf'),
            kind,
            title,
            message,
            createdAt: Date.now(),
            read: false,
          };
          if (s.settings.soundEnabled && kind !== 'success' && kind !== 'error') sfx.notify();
          set((st) => ({ notifications: [n, ...st.notifications].slice(0, 60) }));
        },

        markAllRead: () =>
          set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        dismissNotification: (id) =>
          set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

        clearNotifications: () => set({ notifications: [] }),
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Only persist data that is meaningful across reloads. Live queue items
      // (which depend on in-memory File objects) are reduced to their terminal
      // records so history survives, but in-flight transfers are not resurrected.
      partialize: (state) => ({
        userHosts: state.userHosts,
        settings: state.settings,
        notifications: state.notifications.slice(0, 30),
        uploads: state.uploads
          .filter((u) => u.status === 'completed')
          .slice(0, 200)
          .map((u) => ({ ...u, previewUrl: undefined, speed: 0, eta: 0 })),
      }),
    },
  ),
);

/** Derived merged host list (builtin + user). */
export function useHosts(): HostConfig[] {
  return useStore((s) => mergeHosts(s.userHosts));
}

/** Derived aggregate statistics across all uploads (live + historical). */
export function computeStats(uploads: UploadItem[]): StatsSnapshot {
  const snap: StatsSnapshot = {
    totalUploads: 0,
    totalBytes: 0,
    successCount: 0,
    failureCount: 0,
    byHost: {},
  };
  for (const u of uploads) {
    if (u.status === 'completed') {
      snap.successCount++;
      snap.totalBytes += u.size;
    } else if (u.status === 'failed') {
      snap.failureCount++;
    }
    if (u.status === 'completed' || u.status === 'failed') {
      snap.totalUploads++;
      const h = (snap.byHost[u.hostId] ??= { count: 0, bytes: 0 });
      if (u.status === 'completed') {
        h.count++;
        h.bytes += u.size;
      }
    }
  }
  return snap;
}
