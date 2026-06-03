import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import type { HostConfig } from '@/types';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';

interface HostFormProps {
  initial: HostConfig;
  onSave: (host: HostConfig) => void;
  onClose: () => void;
}

type KV = { key: string; value: string };

function toKV(obj?: Record<string, string>): KV[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({ key, value }));
}
function fromKV(list: KV[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of list) if (key.trim()) out[key.trim()] = value;
  return out;
}

export function HostForm({ initial, onSave, onClose }: HostFormProps) {
  const [host, setHost] = useState<HostConfig>(initial);
  const [fields, setFields] = useState<KV[]>(toKV(initial.fields));
  const [headers, setHeaders] = useState<KV[]>(toKV(initial.headers));
  const [acceptStr, setAcceptStr] = useState((initial.accept ?? []).join(', '));
  const [maxMb, setMaxMb] = useState(
    initial.maxFileSize ? Math.round(initial.maxFileSize / (1024 * 1024)) : 0,
  );

  const set = <K extends keyof HostConfig>(key: K, value: HostConfig[K]) =>
    setHost((h) => ({ ...h, [key]: value }));

  const valid = host.name.trim() && (host.simulated || host.endpoint.trim());

  const submit = () => {
    const finalHost: HostConfig = {
      ...host,
      name: host.name.trim(),
      endpoint: host.simulated && !host.endpoint.trim() ? `simulated://${host.id}` : host.endpoint.trim(),
      fields: fromKV(fields),
      headers: fromKV(headers),
      accept: acceptStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      maxFileSize: maxMb > 0 ? maxMb * 1024 * 1024 : 0,
    };
    onSave(finalHost);
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <motion.div
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ width: 'min(680px, 100%)' }}
      >
        <Card className="modal" ring>
          <div className="modal-head">
            <h2 className="grad-text" style={{ fontSize: 22 }}>
              {initial.builtin ? 'Configure Host' : initial.name ? 'Edit Host' : 'Register New Host'}
            </h2>
            <button className="iconbtn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="stack" style={{ gap: 'var(--space-4)' }}>
            <div className="form-grid">
              <div className="field">
                <span className="label">Display Name</span>
                <input
                  className="input"
                  value={host.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Orbital Core"
                />
              </div>
              <div className="field">
                <span className="label">Region Tag</span>
                <input
                  className="input"
                  value={host.region ?? ''}
                  onChange={(e) => set('region', e.target.value)}
                  placeholder="EU-WEST"
                />
              </div>
              <div className="field full">
                <span className="label">Description</span>
                <input
                  className="input"
                  value={host.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Short summary shown on the host card"
                />
              </div>

              <div className="field full">
                <span className="label">Endpoint URL</span>
                <input
                  className="input mono"
                  value={host.endpoint}
                  onChange={(e) => set('endpoint', e.target.value)}
                  placeholder={host.simulated ? 'simulated:// (auto)' : 'https://api.host.com/upload'}
                  disabled={host.simulated}
                />
              </div>

              <div className="field">
                <span className="label">Method</span>
                <select
                  className="select"
                  value={host.method ?? 'POST'}
                  onChange={(e) => set('method', e.target.value as 'POST' | 'PUT')}
                >
                  <option value="POST">POST (multipart)</option>
                  <option value="PUT">PUT (raw body)</option>
                </select>
              </div>
              <div className="field">
                <span className="label">File Field Name</span>
                <input
                  className="input mono"
                  value={host.fileField ?? 'file'}
                  onChange={(e) => set('fileField', e.target.value)}
                  placeholder="file"
                />
              </div>

              <div className="field">
                <span className="label">Max Size (MB · 0 = ∞)</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  value={maxMb}
                  onChange={(e) => setMaxMb(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <span className="label">Accent Color</span>
                <input
                  className="input"
                  type="color"
                  value={host.accent ?? '#22d3ee'}
                  onChange={(e) => set('accent', e.target.value)}
                  style={{ height: 42, padding: 4 }}
                />
              </div>

              <div className="field full">
                <span className="label">Accepted Types (comma separated · empty = any)</span>
                <input
                  className="input mono"
                  value={acceptStr}
                  onChange={(e) => setAcceptStr(e.target.value)}
                  placeholder="image/*, .pdf, video/mp4"
                />
              </div>
            </div>

            <hr className="hr" />

            <div className="form-grid">
              <div className="field">
                <span className="label">Response Type</span>
                <select
                  className="select"
                  value={host.response?.type ?? 'json'}
                  onChange={(e) =>
                    set('response', { ...host.response, type: e.target.value as 'json' | 'text' })
                  }
                >
                  <option value="json">JSON body</option>
                  <option value="text">Plain text (body is URL)</option>
                </select>
              </div>
              <div className="field">
                <span className="label">URL Path (dot-path)</span>
                <input
                  className="input mono"
                  value={host.response?.urlPath ?? ''}
                  onChange={(e) =>
                    set('response', { ...host.response, type: host.response?.type ?? 'json', urlPath: e.target.value })
                  }
                  placeholder="data.url"
                  disabled={host.response?.type === 'text'}
                />
              </div>
              <div className="field">
                <span className="label">Delete Path (optional)</span>
                <input
                  className="input mono"
                  value={host.response?.deletePath ?? ''}
                  onChange={(e) =>
                    set('response', { ...host.response, type: host.response?.type ?? 'json', deletePath: e.target.value })
                  }
                  placeholder="data.delete"
                  disabled={host.response?.type === 'text'}
                />
              </div>
              <div className="field">
                <span className="label">URL Prefix (optional)</span>
                <input
                  className="input mono"
                  value={host.response?.urlPrefix ?? ''}
                  onChange={(e) =>
                    set('response', { ...host.response, type: host.response?.type ?? 'json', urlPrefix: e.target.value })
                  }
                  placeholder="https://cdn.host.com/"
                />
              </div>
            </div>

            <KVEditor label="Extra Form Fields" list={fields} setList={setFields} />
            <KVEditor label="Request Headers" list={headers} setList={setHeaders} />

            <div className="row between" style={{ gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
                <Toggle on={!!host.simulated} onChange={(v) => set('simulated', v)} />
                <span>
                  <b>Simulated host</b>
                  <small style={{ display: 'block', color: 'var(--ink-faint)' }}>
                    Demo mode — no real network call
                  </small>
                </span>
              </label>
              <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
                <Toggle on={host.enabled !== false} onChange={(v) => set('enabled', v)} />
                <span>
                  <b>Enabled</b>
                  <small style={{ display: 'block', color: 'var(--ink-faint)' }}>
                    Available for routing
                  </small>
                </span>
              </label>
            </div>
          </div>

          <hr className="hr" />
          <div className="row between">
            <span className="label">ID · {host.id}</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary" onClick={submit} disabled={!valid}>
                <Save size={16} /> Save Host
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function KVEditor({
  label,
  list,
  setList,
}: {
  label: string;
  list: KV[];
  setList: (l: KV[]) => void;
}) {
  return (
    <div className="field">
      <div className="row between">
        <span className="label">{label}</span>
        <button className="btn sm ghost" onClick={() => setList([...list, { key: '', value: '' }])}>
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="kvlist">
        {list.length === 0 && <span className="muted" style={{ fontSize: 13 }}>None configured.</span>}
        {list.map((kv, i) => (
          <div className="kv-row" key={i}>
            <input
              className="input mono"
              placeholder="key"
              value={kv.key}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
            />
            <input
              className="input mono"
              placeholder="value"
              value={kv.value}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
            />
            <button
              className="iconbtn danger"
              onClick={() => setList(list.filter((_, j) => j !== i))}
              aria-label="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
