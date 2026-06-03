import { Cpu } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import type { TelemetrySample } from '@/hooks/useTelemetry';

export function AICoreStatus({ t, active }: { t: TelemetrySample; active: number }) {
  return (
    <Card className="aicore" ring scan>
      <div className="reactor">
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <span className="core" />
      </div>
      <div className="meta">
        <div className="row between">
          <div>
            <div className="label">
              <Cpu size={11} style={{ verticalAlign: '-1px' }} /> AI CORE
            </div>
            <div className="big grad-text">ARIA-9 NEURAL UPLINK</div>
          </div>
          <span className="chip ok">
            <span className="dot blink" /> ONLINE
          </span>
        </div>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="kv">
            <span className="k">Cognitive Load</span>
            <span className="val">
              <CountUp value={t.load} decimals={1} />%
            </span>
          </div>
          <div className="kv">
            <span className="k">Active Threads</span>
            <span className="val">{active} / 64</span>
          </div>
          <div className="kv">
            <span className="k">Data Integrity</span>
            <span className="val" style={{ color: 'hsl(var(--ok))' }}>
              <CountUp value={t.integrity} decimals={2} />%
            </span>
          </div>
          <div className="kv">
            <span className="k">Core Latency</span>
            <span className="val">
              <CountUp value={t.latency} decimals={0} /> ms
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
