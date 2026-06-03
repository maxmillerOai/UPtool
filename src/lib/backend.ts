import { API_BASE } from '@/config/app.config';

export interface BackendPlugin {
  id: string;
  label: string;
  source: string;
  credentialFields?: string[] | null;
}

/** Lists the filehost plugins exposed by the backend bridge. */
export async function fetchBackendHosts(): Promise<BackendPlugin[]> {
  const res = await fetch(`${API_BASE}/api/hosts`, { method: 'GET' });
  if (!res.ok) throw new Error(`Backend hosts ${res.status}`);
  const data = (await res.json()) as { hosts: BackendPlugin[] };
  return data.hosts ?? [];
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
