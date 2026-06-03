import { Globe2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';

const NODES = [
  { x: 18, y: 38, label: 'US-WEST' },
  { x: 30, y: 30, label: 'US-EAST' },
  { x: 48, y: 26, label: 'EU-WEST' },
  { x: 54, y: 34, label: 'EU-CENTRAL' },
  { x: 70, y: 42, label: 'AP-SOUTH' },
  { x: 82, y: 36, label: 'AP-EAST' },
  { x: 40, y: 60, label: 'SA-EAST' },
];

const LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [1, 6],
  [3, 5],
  [0, 6],
];

export function NetworkMap() {
  return (
    <Card className="pad">
      <CardHeader
        icon={<Globe2 size={18} />}
        title="Global Network Map"
        right={<span className="chip ok"><span className="dot" /> {NODES.length} nodes online</span>}
      />
      <div className="netmap">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {LINKS.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x}
              y1={NODES[a].y * 0.85}
              x2={NODES[b].x}
              y2={NODES[b].y * 0.85}
              stroke="hsl(var(--c-primary) / 0.3)"
              strokeWidth="0.3"
              strokeDasharray="1 1.4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            </line>
          ))}
        </svg>
        {NODES.map((n) => (
          <span
            key={n.label}
            className="node"
            style={{ left: `${n.x}%`, top: `${n.y * 0.85}%` }}
            data-tip={n.label}
          />
        ))}
      </div>
    </Card>
  );
}
