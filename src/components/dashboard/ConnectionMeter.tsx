import { SignalHigh } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import type { TelemetrySample } from '@/hooks/useTelemetry';

export function ConnectionMeter({ t }: { t: TelemetrySample }) {
  const bars = 16;
  const lit = Math.round((t.signal / 100) * bars);
  return (
    <Card className="pad">
      <CardHeader
        icon={<SignalHigh size={18} />}
        title="Connection Stability"
        right={
          <span className="mono" style={{ color: 'hsl(var(--c-primary))', fontWeight: 700 }}>
            <CountUp value={t.signal} decimals={0} />%
          </span>
        }
      />
      <div className="meter">
        {Array.from({ length: bars }, (_, i) => (
          <i
            key={i}
            className={i < lit ? 'on' : ''}
            style={{ height: `${30 + (i / bars) * 70}%` }}
          />
        ))}
      </div>
      <div className="row between" style={{ marginTop: 'var(--space-3)' }}>
        <span className="label">Jitter {(t.latency * 0.12).toFixed(1)}ms</span>
        <span className="label">Packet Loss 0.0%</span>
      </div>
    </Card>
  );
}
