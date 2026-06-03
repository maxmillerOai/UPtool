import { useMemo } from 'react';
import { Radar } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import type { UploadItem } from '@/types';

export function TransferRadar({ uploads }: { uploads: UploadItem[] }) {
  const active = uploads.filter(
    (u) => u.status === 'uploading' || u.status === 'processing' || u.status === 'queued',
  );

  const blips = useMemo(() => {
    return active.slice(0, 10).map((u, i) => {
      const angle = (i / Math.max(1, active.length)) * Math.PI * 2 + i;
      const radius = 18 + ((u.progress || (i * 11) % 70) / 100) * 30;
      return {
        id: u.id,
        left: 50 + Math.cos(angle) * radius,
        top: 50 + Math.sin(angle) * radius,
      };
    });
  }, [active]);

  return (
    <Card className="pad">
      <CardHeader
        icon={<Radar size={18} />}
        title="Active Transfer Radar"
        right={<span className="chip info"><span className="dot" />{active.length} signals</span>}
      />
      <div className="radar">
        <div className="grid-rings">
          {[80, 55, 30].map((s) => (
            <span
              key={s}
              className="rrng"
              style={{ width: `${s}%`, height: `${s}%` }}
            />
          ))}
        </div>
        <span className="rrng" style={{ width: '1px', height: '100%' }} />
        <span className="rrng" style={{ width: '100%', height: '1px', borderRadius: 0 }} />
        <div className="sweep" />
        {blips.map((b) => (
          <span
            key={b.id}
            className="blip"
            style={{ left: `${b.left}%`, top: `${b.top}%` }}
          />
        ))}
        {blips.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-faint)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.15em',
            }}
          >
            NO ACTIVE SIGNALS
          </div>
        )}
      </div>
    </Card>
  );
}
