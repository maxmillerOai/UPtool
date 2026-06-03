import type { Settings } from '@/types';
import { DEFAULT_THEME_ID } from './themes.config';

export const APP_META = {
  name: 'UPtool',
  codename: 'Orbital Uplink Command',
  version: '1.0.0',
  build: 'AX-2100',
} as const;

/**
 * Base URL for the backend plugin bridge. In dev, Vite proxies `/api` to the
 * server (see vite.config.ts), so the default empty base works for both dev and
 * same-origin production. Override with VITE_API_BASE if the API is hosted
 * elsewhere.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  defaultHostId: 'orbital-core',
  maxConcurrent: 3,
  autoRetry: true,
  maxRetries: 3,
  autoCopyOnComplete: false,
  soundEnabled: true,
  particlesEnabled: true,
  scanlinesEnabled: true,
  reducedMotion: false,
  notificationsEnabled: true,
};

/** Persistence keys. */
export const STORAGE_KEY = 'uptool.state.v1';
