import { useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Database,
  Percent,
  Boxes,
  Server,
} from 'lucide-react';
import { useStore, useHosts, computeStats } from '@/store/useStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { findHost } from '@/lib/hostRegistry';
import { formatBytes } from '@/lib/format';

export function StatsView() {
  const uploads = useStore((s) => s.uploads);
  const hosts = useHosts();
  const stats = computeStats(uploads);

  const successRate = stats.totalUploads > 0 ? (stats.successCount / stats.totalUploads) * 100 : 100;

  const tiles = [
    { icon: <Boxes size={18} />, label: 'Total Uploads', value: stats.totalUploads, color: 'hsl(var(--c-primary))' },
    { icon: <CheckCircle2 size={18} />, label: 'Successful', value: stats.successCount, color: 'hsl(var(--ok))' },
    { icon: <XCircle size={18} />, label: 'Failed', value: stats.failureCount, color: 'hsl(var(--err))' },
    { icon: <Percent size={18} />, label: 'Success Rate', value: successRate, decimals: 1, suffix: '%', color: 'hsl(var(--c-tertiary))' },
  ];

  const hostBars = useMemo(() => {
    const entries = Object.entries(stats.byHost).map(([id, v]) => ({
      id,
      name: findHost(hosts, id)?.name ?? id,
      ...v,
    }));
    const max = Math.max(1, ...entries.map((e) => e.bytes));
    return entries.sort((a, b) => b.bytes - a.bytes).map((e) => ({ ...e, pct: (e.bytes / max) * 100 }));
  }, [stats.byHost, hosts]);

  // file-type breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of uploads) {
      if (u.status !== 'completed') continue;
      const major = (u.type.split('/')[0] || 'other').toUpperCase();
      map.set(major, (map.get(major) ?? 0) + 1);
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
    return [...map.entries()]
      .map(([k, v]) => ({ k, v, pct: (v / total) * 100 }))
      .sort((a, b) => b.v - a.v);
  }, [uploads]);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Analytics Core</h1>
          <div className="sub">Aggregate intelligence across all uplink operations</div>
        </div>
      </div>

      <div className="grid" style={{ gap: 'var(--space-5)' }}>
        <div className="stat-tiles">
          {tiles.map((t) => (
            <Card className="metric" key={t.label}>
              <div className="top">
                <span className="label">{t.label}</span>
                <span style={{ color: t.color }}>{t.icon}</span>
              </div>
              <div>
                <span className="v" style={{ color: t.color }}>
                  <CountUp value={t.value} decimals={t.decimals ?? 0} />
                  {t.suffix}
                </span>
              </div>
              <div className="bar">
                <i style={{ transform: `scaleX(${t.label === 'Success Rate' ? successRate / 100 : 0.5})` }} />
              </div>
            </Card>
          ))}
        </div>

        <div className="dash">
          <div className="col-6">
            <Card className="pad">
              <CardHeader icon={<Server size={18} />} title="Volume by Host" />
              {hostBars.length === 0 ? (
                <div className="empty"><span className="muted">No data yet.</span></div>
              ) : (
                <div className="bars-h">
                  {hostBars.map((b) => (
                    <div className="bar-h-row" key={b.id}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.name}
                      </span>
                      <div className="bar-h-track">
                        <i style={{ width: `${Math.max(2, b.pct)}%` }} />
                      </div>
                      <span className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                        {formatBytes(b.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="col-6">
            <Card className="pad">
              <CardHeader icon={<BarChart3 size={18} />} title="Payload Composition" />
              {typeBreakdown.length === 0 ? (
                <div className="empty"><span className="muted">No data yet.</span></div>
              ) : (
                <div className="bars-h">
                  {typeBreakdown.map((b) => (
                    <div className="bar-h-row" key={b.k}>
                      <span>{b.k}</span>
                      <div className="bar-h-track">
                        <i style={{ width: `${Math.max(2, b.pct)}%` }} />
                      </div>
                      <span className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                        {b.v} · {b.pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="col-12">
            <Card className="pad">
              <CardHeader icon={<Database size={18} />} title="Lifetime Data Transferred" />
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div>
                  <div className="v grad-text" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800 }}>
                    <CountUp value={stats.totalBytes} format={(n) => formatBytes(n)} />
                  </div>
                  <div className="label">Across {stats.successCount.toLocaleString()} successful transmissions</div>
                </div>
                <div className="chip ok" style={{ fontSize: 13 }}>
                  <span className="dot blink" /> ARCHIVE SYNCED
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
