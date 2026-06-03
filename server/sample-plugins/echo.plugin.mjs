import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

/**
 * Self-contained mock plugin used to exercise the backend bridge end-to-end
 * without any real host or credentials. It follows the exact same contract as
 * the real filehost plugins: upload({ filePath, credentials, onProgress }).
 *
 * It "uploads" by simulating progress against the real file size on disk and
 * returns a deterministic link. Replace by pointing PLUGINS_DIR at your real
 * plugin folder.
 */
export const id = 'echo';
export const label = 'Echo (Mock Host)';
export const credentialFields = [];

export async function upload({ filePath, onProgress }) {
  const { size } = await stat(filePath);
  const total = size || 1;
  let loaded = 0;
  const stepBytes = Math.max(64 * 1024, Math.floor(total / 40));

  while (loaded < total) {
    loaded = Math.min(total, loaded + stepBytes);
    if (typeof onProgress === 'function') onProgress({ loaded, total });
    await new Promise((r) => setTimeout(r, 60));
  }

  const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const link = `https://echo.local/${slug}/${encodeURIComponent(basename(filePath))}`;
  return {
    host: id,
    link,
    plainText: link,
    raw: { mock: true, bytes: total, slug },
  };
}

export default { id, label, credentialFields, upload };
