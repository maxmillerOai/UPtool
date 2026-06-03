import { Database } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatBytes } from '@/lib/format';

const CAPACITY = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB virtual capacity

export function StorageOverview({ usedBytes, count }: { usedBytes: number; count: number }) {
  const pct = Math.min(100, (usedBytes / CAPACITY) * 100);
  const size = 130;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Card className="pad">
      <CardHeader icon={<Database size={18} />} title="Storage Overview" />
      <div className="donut-wrap">
        <svg className="donut" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="st-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--c-tertiary))" />
              <stop offset="100%" stopColor="hsl(var(--c-primary))" />
            </linearGradient>
          </defs>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--line) / 0.1)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#st-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s var(--ease-out)', filter: 'drop-shadow(0 0 6px hsl(var(--c-primary) / 0.6))' }}
            />
          </g>
          <text x="50%" y="46%" textAnchor="middle" fill="var(--ink)" fontFamily="var(--font-display)" fontSize="22" fontWeight="800">
            {pct < 0.1 ? '0' : pct.toFixed(1)}%
          </text>
          <text x="50%" y="60%" textAnchor="middle" fill="var(--ink-faint)" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="2">
            UTILIZED
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div className="kv">
            <span className="k">Used</span>
            <span className="val">{formatBytes(usedBytes)}</span>
          </div>
          <div className="kv">
            <span className="k">Capacity</span>
            <span className="val">{formatBytes(CAPACITY)}</span>
          </div>
          <div className="kv">
            <span className="k">Objects</span>
            <span className="val">{count.toLocaleString()}</span>
          </div>
          <div className="kv">
            <span className="k">Tier</span>
            <span className="val" style={{ color: 'hsl(var(--c-primary))' }}>QUANTUM-COLD</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
