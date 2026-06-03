import { Activity } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import type { TelemetrySample } from '@/hooks/useTelemetry';

export function ThroughputGraph({ t }: { t: TelemetrySample }) {
  const data = t.throughput;
  const w = 100;
  const h = 100;
  const max = Math.max(...data, 100);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const current = data[data.length - 1];

  return (
    <Card className="pad">
      <CardHeader
        icon={<Activity size={18} />}
        title="Data Throughput"
        right={
          <span className="mono" style={{ color: 'hsl(var(--c-primary))', fontSize: 18, fontWeight: 700 }}>
            {current.toFixed(0)} <small style={{ color: 'var(--ink-faint)' }}>MB/s</small>
          </span>
        }
      />
      <svg className="graph" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="tp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--c-primary) / 0.5)" />
            <stop offset="100%" stopColor="hsl(var(--c-primary) / 0)" />
          </linearGradient>
          <linearGradient id="tp-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--c-secondary))" />
            <stop offset="100%" stopColor="hsl(var(--c-primary))" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line key={g} x1="0" y1={g} x2={w} y2={g} stroke="hsl(var(--line) / 0.08)" strokeWidth="0.4" />
        ))}
        <path d={area} fill="url(#tp-fill)" />
        <path
          d={line}
          fill="none"
          stroke="url(#tp-line)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: 'drop-shadow(0 0 4px hsl(var(--c-primary) / 0.7))' }}
        />
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="1.8"
          fill="#fff"
          style={{ filter: 'drop-shadow(0 0 4px hsl(var(--c-primary)))' }}
        />
      </svg>
    </Card>
  );
}
