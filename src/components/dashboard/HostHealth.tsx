import { ServerCog } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { useHosts } from '@/store/useStore';

/** Deterministic pseudo-health so a host shows a stable value between renders. */
function healthFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return 78 + (h % 22);
}

export function HostHealth() {
  const hosts = useHosts();
  return (
    <Card className="pad">
      <CardHeader icon={<ServerCog size={18} />} title="Host Health Monitor" />
      <div>
        {hosts.map((host) => {
          const enabled = host.enabled !== false;
          const health = enabled ? healthFor(host.id) : 0;
          const color =
            health > 90 ? 'hsl(var(--ok))' : health > 75 ? 'hsl(var(--warn))' : 'hsl(var(--err))';
          return (
            <div className="health-row" key={host.id}>
              <span
                className="chip"
                style={{
                  color: enabled ? color : 'var(--ink-faint)',
                  borderColor: 'transparent',
                  padding: 0,
                  background: 'none',
                }}
              >
                <span className="dot" style={{ boxShadow: `0 0 8px ${enabled ? color : 'transparent'}` }} />
              </span>
              <div className="name">
                {host.name}
                <small>{host.region ?? 'UNKNOWN'}</small>
              </div>
              <div className="health-bar">
                <i style={{ width: `${health}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
              </div>
              <span
                className="mono"
                style={{ width: 56, textAlign: 'right', fontSize: 12, color: enabled ? color : 'var(--ink-faint)' }}
              >
                {enabled ? `${health}%` : 'OFFLINE'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
