import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Power,
  ShieldCheck,
  Boxes,
  Cpu,
} from 'lucide-react';
import { useStore, useHosts, computeStats } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { HostForm } from '@/components/hosts/HostForm';
import { emptyHost } from '@/lib/hostRegistry';
import { uid } from '@/lib/id';
import { formatBytes } from '@/lib/format';
import type { HostConfig } from '@/types';

export function HostsView() {
  const hosts = useHosts();
  const uploads = useStore((s) => s.uploads);
  const upsertHost = useStore((s) => s.upsertHost);
  const deleteHost = useStore((s) => s.deleteHost);
  const toggleHost = useStore((s) => s.toggleHost);
  const stats = computeStats(uploads);

  const [editing, setEditing] = useState<HostConfig | null>(null);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Host Constellation</h1>
          <div className="sub">
            Configuration-driven upload nodes · add real endpoints without code changes
          </div>
        </div>
        <button className="btn primary" onClick={() => setEditing(emptyHost(uid('host')))}>
          <Plus size={17} /> Register Host
        </button>
      </div>

      <Card className="pad" holo={false} edge style={{ marginBottom: 'var(--space-5)' }}>
        <div className="row" style={{ gap: 'var(--space-4)', color: 'var(--ink-dim)' }}>
          <ShieldCheck size={18} style={{ color: 'hsl(var(--c-primary))' }} />
          <span style={{ fontSize: 13 }}>
            Builtin hosts run in <b>simulated</b> mode until real endpoints are supplied. Edit any
            host to point it at a live API — UPtool reads the response using the configured dot-path
            mapping. New hosts can also be defined in{' '}
            <code className="mono" style={{ color: 'hsl(var(--c-primary))' }}>
              src/config/hosts.config.ts
            </code>
            .
          </span>
        </div>
      </Card>

      <div className="hosts-grid">
        {hosts.map((host) => {
          const enabled = host.enabled !== false;
          const hostStats = stats.byHost[host.id] ?? { count: 0, bytes: 0 };
          return (
            <Card className="host-card" key={host.id} scan={enabled} style={{ opacity: enabled ? 1 : 0.6 }}>
              <div className="hc-top">
                <div
                  className="hc-icon"
                  style={{
                    background: `linear-gradient(135deg, ${host.accent ?? '#22d3ee'}, ${host.accent ?? '#22d3ee'}55)`,
                    boxShadow: `0 0 20px ${host.accent ?? '#22d3ee'}66`,
                  }}
                >
                  {host.name.slice(0, 2).toUpperCase() || 'HS'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hc-name">{host.name}</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="chip">{host.region ?? 'CUSTOM'}</span>
                    {host.simulated ? (
                      <span className="chip warn">
                        <Cpu size={11} /> SIM
                      </span>
                    ) : (
                      <span className="chip ok">
                        <span className="dot" /> LIVE
                      </span>
                    )}
                    {host.builtin && <span className="chip info">BUILTIN</span>}
                  </div>
                </div>
                <Toggle on={enabled} onChange={(v) => toggleHost(host.id, v)} />
              </div>

              <p className="hc-desc">{host.description || 'No description provided.'}</p>

              <div className="hc-stats">
                <div className="s">
                  <span>Uploads</span>
                  {hostStats.count.toLocaleString()}
                </div>
                <div className="s">
                  <span>Volume</span>
                  {formatBytes(hostStats.bytes)}
                </div>
                <div className="s">
                  <span>Max Size</span>
                  {host.maxFileSize ? formatBytes(host.maxFileSize) : '∞'}
                </div>
                <div className="s">
                  <span>Response</span>
                  {host.response?.type === 'text' ? 'TEXT' : `JSON·${host.response?.urlPath ?? 'url'}`}
                </div>
              </div>

              <div className="hc-foot">
                <button className="btn sm ghost" onClick={() => setEditing(host)}>
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => toggleHost(host.id, !enabled)}
                >
                  <Power size={14} /> {enabled ? 'Disable' : 'Enable'}
                </button>
                {!host.builtin && (
                  <button
                    className="btn sm ghost danger"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => deleteHost(host.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}

        <Card
          className="host-card"
          holo={false}
          onClick={() => setEditing(emptyHost(uid('host')))}
          style={{
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            minHeight: 220,
            borderStyle: 'dashed',
          }}
        >
          <div className="empty" style={{ padding: 0 }}>
            <div className="ico">
              <Boxes size={26} />
            </div>
            <b>Register New Host</b>
            <span className="muted" style={{ fontSize: 13 }}>
              Add an upload endpoint via configuration
            </span>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {editing && (
          <HostForm
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={(h) => {
              upsertHost(h);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      {hosts.length === 0 && (
        <div className="empty">
          <div className="ico">
            <Server size={28} />
          </div>
          <b>No hosts configured</b>
        </div>
      )}
    </div>
  );
}
