import { useMemo, useState } from 'react';
import {
  History,
  Copy,
  ExternalLink,
  Trash2,
  RotateCcw,
  Search,
  Download,
  Archive,
} from 'lucide-react';
import { useStore, useHosts } from '@/store/useStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { findHost } from '@/lib/hostRegistry';
import { formatBytes, formatRelativeTime, fileExtension } from '@/lib/format';
import { statusMeta } from '@/lib/status';
import { sfx } from '@/lib/sound';
import type { UploadStatus } from '@/types';

type Filter = 'all' | 'completed' | 'failed' | 'cancelled';

export function HistoryView() {
  const uploads = useStore((s) => s.uploads);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const removeUpload = useStore((s) => s.removeUpload);
  const retryUpload = useStore((s) => s.retryUpload);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const notify = useStore((s) => s.notify);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const hosts = useHosts();

  const [filter, setFilter] = useState<Filter>('all');

  const terminalStatuses: UploadStatus[] = ['completed', 'failed', 'cancelled'];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return uploads
      .filter((u) => terminalStatuses.includes(u.status))
      .filter((u) => (filter === 'all' ? true : u.status === filter))
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          (u.result?.url ?? '').toLowerCase().includes(q) ||
          (findHost(hosts, u.hostId)?.name ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads, filter, search, hosts]);

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      if (soundEnabled) sfx.click();
      notify('success', 'Link copied', text);
    });
  };

  const copyAll = () => {
    const urls = rows
      .filter((r) => r.status === 'completed' && r.result?.url)
      .map((r) => r.result!.url);
    if (urls.length === 0) return;
    void navigator.clipboard?.writeText(urls.join('\n')).then(() => {
      notify('success', 'Links copied', `${urls.length} link(s) on the clipboard`);
    });
  };

  const exportJson = () => {
    const data = rows.map((r) => ({
      name: r.name,
      size: r.size,
      host: r.hostId,
      status: r.status,
      url: r.result?.url ?? null,
      completedAt: r.completedAt ?? null,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `uptool-archive-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('info', 'Archive exported', `${data.length} records`);
  };

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Transmission Archive</h1>
          <div className="sub">Searchable ledger of every uplink event</div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn sm" onClick={copyAll}>
            <Copy size={15} /> Copy Links
          </button>
          <button className="btn sm" onClick={exportJson}>
            <Download size={15} /> Export
          </button>
          <button className="btn sm danger" onClick={clearCompleted}>
            <Trash2 size={15} /> Purge
          </button>
        </div>
      </div>

      <Card className="pad">
        <CardHeader
          icon={<History size={18} />}
          title={`Records · ${rows.length}`}
          right={
            <div className="row" style={{ gap: 12 }}>
              <div className="searchbox" style={{ width: 220 }}>
                <Search size={15} />
                <input
                  className="input"
                  placeholder="Filter…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="segmented">
                {(['all', 'completed', 'failed', 'cancelled'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    className={filter === f ? 'on' : ''}
                    onClick={() => setFilter(f)}
                  >
                    {f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {rows.length === 0 ? (
          <div className="empty">
            <div className="ico">
              <Archive size={28} />
            </div>
            <div>
              <b>No records found</b>
              <div className="muted" style={{ fontSize: 13 }}>
                Completed transmissions will appear here.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Host</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>When</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = statusMeta(r.status);
                  const host = findHost(hosts, r.hostId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="file-cell">
                          <div className="mini">
                            {r.previewUrl ? (
                              <img src={r.previewUrl} alt="" />
                            ) : (
                              fileExtension(r.name)
                            )}
                          </div>
                          <div className="nm">
                            <b title={r.name}>{r.name}</b>
                            {r.result?.url && (
                              <small title={r.result.url}>{r.result.url}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="chip" style={{ borderColor: 'hsl(var(--c-primary) / 0.3)' }}>
                          {host?.name ?? r.hostId}
                        </span>
                      </td>
                      <td className="mono">{formatBytes(r.size)}</td>
                      <td>
                        <span className={`chip ${meta.tone === 'idle' ? '' : meta.tone}`}>
                          <span className="dot" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="mono" style={{ color: 'var(--ink-dim)', fontSize: 12 }}>
                        {formatRelativeTime(r.completedAt ?? r.createdAt)}
                      </td>
                      <td>
                        <div className="acts">
                          {r.result?.url && (
                            <>
                              <button className="iconbtn" data-tip="Copy" onClick={() => copy(r.result!.url)}>
                                <Copy size={15} />
                              </button>
                              <a className="iconbtn" data-tip="Open" href={r.result.url} target="_blank" rel="noreferrer">
                                <ExternalLink size={15} />
                              </a>
                            </>
                          )}
                          {(r.status === 'failed' || r.status === 'cancelled') && (
                            <button className="iconbtn" data-tip="Retry" onClick={() => retryUpload(r.id)}>
                              <RotateCcw size={15} />
                            </button>
                          )}
                          <button className="iconbtn danger" data-tip="Delete" onClick={() => removeUpload(r.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
