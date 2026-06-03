import { Gauge, Layers, Zap, Timer } from 'lucide-react';
import type { UploadItem } from '@/types';
import { formatSpeed, formatBytes, formatDuration } from '@/lib/format';

export function UploadTelemetry({ uploads }: { uploads: UploadItem[] }) {
  const active = uploads.filter((u) => u.status === 'uploading' || u.status === 'processing');
  const queued = uploads.filter((u) => u.status === 'queued');
  const totalSpeed = active.reduce((a, u) => a + u.speed, 0);
  const remainingBytes = [...active, ...queued].reduce(
    (a, u) => a + (u.size - u.loaded),
    0,
  );
  const eta = totalSpeed > 0 ? remainingBytes / totalSpeed : 0;

  const cells = [
    {
      icon: <Gauge size={16} />,
      v: formatSpeed(totalSpeed),
      k: 'Live Throughput',
    },
    {
      icon: <Layers size={16} />,
      v: `${active.length}/${active.length + queued.length}`,
      k: 'Active / Total',
    },
    {
      icon: <Zap size={16} />,
      v: formatBytes(remainingBytes),
      k: 'Remaining',
    },
    {
      icon: <Timer size={16} />,
      v: formatDuration(eta),
      k: 'Est. Completion',
    },
  ];

  return (
    <div className="telemetry">
      {cells.map((c) => (
        <div className="cell" key={c.k}>
          <div className="row" style={{ color: 'var(--ink-dim)', marginBottom: 6 }}>
            {c.icon}
            <span className="label">{c.k}</span>
          </div>
          <div className="v">{c.v}</div>
        </div>
      ))}
    </div>
  );
}
