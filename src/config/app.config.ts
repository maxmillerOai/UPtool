import type { Settings } from '@/types';
import { DEFAULT_THEME_ID } from './themes.config';

export const APP_META = {
  name: 'UPtool',
  codename: 'Orbital Uplink Command',
  version: '1.0.0',
  build: 'AX-2100',
} as const;

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
