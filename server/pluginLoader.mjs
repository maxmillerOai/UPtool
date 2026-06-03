import { readdir, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join, isAbsolute, resolve } from 'node:path';

/**
 * Discovers and loads filehost plugins from a directory.
 *
 * A plugin is any file matching `*.plugin.mjs` that exports the contract:
 *   - id:    string            unique host id
 *   - label: string            human-readable name
 *   - upload({ filePath, credentials, onProgress }) => Promise<{ link, plainText?, raw? }>
 *
 * Both named exports and a default export object are supported, matching the
 * shape used by the provided plugins (e.g. rapidgator.plugin.mjs).
 */
export async function loadPlugins(dir) {
  const absDir = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  let entries = [];
  try {
    const dirStat = await stat(absDir);
    if (!dirStat.isDirectory()) {
      console.warn(`[plugins] PLUGINS_DIR is not a directory: ${absDir}`);
      return new Map();
    }
    entries = await readdir(absDir);
  } catch (err) {
    console.warn(`[plugins] Could not read plugins dir "${absDir}": ${err.message}`);
    return new Map();
  }

  const files = entries.filter((f) => f.endsWith('.plugin.mjs'));
  const plugins = new Map();

  for (const file of files) {
    const full = join(absDir, file);
    try {
      const mod = await import(pathToFileURL(full).href);
      const plugin = normalizePlugin(mod, file);
      if (!plugin) {
        console.warn(`[plugins] Skipped ${file}: missing id/label/upload export`);
        continue;
      }
      if (plugins.has(plugin.id)) {
        console.warn(`[plugins] Duplicate plugin id "${plugin.id}" in ${file} — overriding`);
      }
      plugins.set(plugin.id, plugin);
      console.log(`[plugins] Loaded "${plugin.id}" (${plugin.label}) from ${file}`);
    } catch (err) {
      console.error(`[plugins] Failed to load ${file}: ${err.message}`);
    }
  }
  return plugins;
}

function normalizePlugin(mod, file) {
  const def = mod.default ?? {};
  const id = mod.id ?? def.id;
  const label = mod.label ?? def.label ?? id;
  const upload = mod.upload ?? def.upload;
  if (!id || typeof upload !== 'function') return null;
  return {
    id: String(id),
    label: String(label),
    upload,
    source: file,
    /** Optional declared credential field names (if the plugin exposes them). */
    credentialFields: mod.credentialFields ?? def.credentialFields ?? null,
  };
}
