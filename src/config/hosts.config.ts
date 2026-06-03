import type { HostConfig } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HOST CONFIGURATION LAYER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This is the ONLY file you need to touch to add a new upload host.
 * The rest of the application reads hosts from here (merged with any hosts the
 * user adds at runtime through the Host Manager). No core/application code needs
 * to change when a host is added or removed.
 *
 * To add a real host, append an object to `BUILTIN_HOSTS`, for example:
 *
 *   {
 *     id: 'my-host',
 *     name: 'My Host',
 *     region: 'EU-WEST',
 *     endpoint: 'https://api.myhost.com/upload',
 *     method: 'POST',
 *     fileField: 'file',
 *     fields: { token: 'PUBLIC_TOKEN' },
 *     headers: { Authorization: 'Bearer XXX' },
 *     maxFileSize: 512 * 1024 * 1024,
 *     accept: ['image/*', 'video/*'],
 *     response: { type: 'json', urlPath: 'data.url', deletePath: 'data.delete' },
 *     accent: '#22d3ee',
 *     enabled: true,
 *     builtin: true,
 *   }
 *
 * The `response` mapping tells UPtool how to read the host's reply:
 *   - type: 'text'  → the response body IS the URL
 *   - type: 'json'  → read `urlPath` (dot-path) from the parsed JSON body
 *
 * Until real endpoints are wired in, a set of `simulated` hosts is provided so
 * the entire platform is fully functional and demonstrable out of the box.
 */

export const BUILTIN_HOSTS: HostConfig[] = [
  {
    id: 'orbital-core',
    name: 'Orbital Core',
    description: 'Primary high-throughput uplink node. Balanced latency.',
    region: 'GEO-SYNC',
    endpoint: 'simulated://orbital-core',
    method: 'POST',
    fileField: 'file',
    maxFileSize: 2 * 1024 * 1024 * 1024,
    accept: [],
    response: { type: 'json', urlPath: 'data.url', deletePath: 'data.delete' },
    simulated: true,
    enabled: true,
    accent: '#22d3ee',
    builtin: true,
  },
  {
    id: 'nebula-relay',
    name: 'Nebula Relay',
    description: 'Edge relay optimized for media and large binaries.',
    region: 'EU-WEST',
    endpoint: 'simulated://nebula-relay',
    method: 'POST',
    fileField: 'upload',
    maxFileSize: 1 * 1024 * 1024 * 1024,
    accept: [],
    response: { type: 'json', urlPath: 'url' },
    simulated: true,
    enabled: true,
    accent: '#a855f7',
    builtin: true,
  },
  {
    id: 'quantum-vault',
    name: 'Quantum Vault',
    description: 'Redundant cold-storage vault with quantum-grade integrity.',
    region: 'US-EAST',
    endpoint: 'simulated://quantum-vault',
    method: 'POST',
    fileField: 'file',
    maxFileSize: 5 * 1024 * 1024 * 1024,
    accept: [],
    response: { type: 'text' },
    simulated: true,
    enabled: true,
    accent: '#34d399',
    builtin: true,
  },
  {
    id: 'pulsar-cdn',
    name: 'Pulsar CDN',
    description: 'Global anycast CDN for ultra-low-latency distribution.',
    region: 'GLOBAL',
    endpoint: 'simulated://pulsar-cdn',
    method: 'POST',
    fileField: 'file',
    maxFileSize: 512 * 1024 * 1024,
    accept: [],
    response: { type: 'json', urlPath: 'files.0.url' },
    simulated: true,
    enabled: true,
    accent: '#f59e0b',
    builtin: true,
  },
];
