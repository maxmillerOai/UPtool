import type { HostConfig } from '@/types';
import { BUILTIN_HOSTS } from '@/config/hosts.config';

/**
 * Merges the source-defined hosts with user-defined hosts (added at runtime via
 * the Host Manager). User hosts with the same id override builtin definitions so
 * users can tweak builtin hosts without editing source.
 */
export function mergeHosts(userHosts: HostConfig[]): HostConfig[] {
  const map = new Map<string, HostConfig>();
  for (const h of BUILTIN_HOSTS) map.set(h.id, { ...h });
  for (const h of userHosts) {
    const existing = map.get(h.id);
    map.set(h.id, existing ? { ...existing, ...h } : { ...h });
  }
  return [...map.values()];
}

export function findHost(hosts: HostConfig[], id: string): HostConfig | undefined {
  return hosts.find((h) => h.id === id);
}

export function enabledHosts(hosts: HostConfig[]): HostConfig[] {
  return hosts.filter((h) => h.enabled !== false);
}

/** A blank host template used by the "add host" form. */
export function emptyHost(id: string): HostConfig {
  return {
    id,
    name: '',
    description: '',
    region: 'CUSTOM',
    endpoint: '',
    method: 'POST',
    fileField: 'file',
    fields: {},
    headers: {},
    maxFileSize: 0,
    accept: [],
    response: { type: 'json', urlPath: 'url' },
    simulated: false,
    enabled: true,
    accent: '#22d3ee',
    builtin: false,
  };
}
