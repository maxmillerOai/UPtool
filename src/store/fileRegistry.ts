import type { UploadHandle } from '@/lib/uploader';

/**
 * File objects and live upload handles cannot be serialized into persisted
 * state, so they live here in module scope keyed by upload id.
 */
export const fileRegistry = new Map<string, File>();
export const handleRegistry = new Map<string, UploadHandle>();

export function disposeUpload(id: string) {
  handleRegistry.delete(id);
  fileRegistry.delete(id);
}
