import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const SETTINGS_PATH = resolve(ROOT, "settings.json");

export async function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  return JSON.parse(await readFile(SETTINGS_PATH, "utf8"));
}

export async function saveSettings(settings) {
  await writeFile(SETTINGS_PATH, JSON.stringify(settings || {}, null, 2), "utf8");
  return loadSettings();
}
