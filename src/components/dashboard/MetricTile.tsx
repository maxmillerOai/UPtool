import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: number;
  spark?: number[];
}

export function MetricTile({ icon, label, value, unit, trend, spark }: MetricTileProps) {
  const max = spark && spark.length ? Math.max(...spark, 1) : 1;
  return (
    <Card className="metric" holo>
      <div className="top">
        <span className="label">{label}</span>
        <span style={{ color: 'hsl(var(--c-primary))' }}>{icon}</span>
      </div>
      <div>
        <span className="v grad-text">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {spark ? (
        <div className="spark">
          {spark.map((s, i) => (
            <i key={i} style={{ height: `${(s / max) * 100}%` }} />
          ))}
        </div>
      ) : (
        trend !== undefined && (
          <div
            className="trend"
            style={{ color: trend >= 0 ? 'hsl(var(--ok))' : 'hsl(var(--err))' }}
          >
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend).toFixed(1)}% · 24h
          </div>
        )
      )}
    </Card>
  );
}
