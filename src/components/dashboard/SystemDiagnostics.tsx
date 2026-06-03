import { useEffect, useState } from 'react';
import { TerminalSquare } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatTime } from '@/lib/format';

interface LogLine {
  id: number;
  level: 'ok' | 'warn' | 'err' | 'info';
  text: string;
  time: number;
}

const MESSAGES: Array<[LogLine['level'], string]> = [
  ['ok', 'Quantum handshake established with relay grid'],
  ['info', 'Recalibrating entropy buffers · nominal'],
  ['ok', 'Integrity checksum verified across shards'],
  ['warn', 'Thermal flux on node EU-WEST within tolerance'],
  ['info', 'Neural cache warm · 64 threads spun up'],
  ['ok', 'Encryption lattice rotated · AES-1024'],
  ['info', 'Telemetry sync pulse dispatched'],
  ['ok', 'Edge cache primed · 12 regions'],
  ['warn', 'Backpressure detected · auto-throttling enabled'],
  ['ok', 'Redundancy mirror confirmed · 3/3'],
];

let counter = 0;

export function SystemDiagnostics() {
  const [lines, setLines] = useState<LogLine[]>(() =>
    Array.from({ length: 6 }, () => {
      const [level, text] = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      return { id: counter++, level, text, time: Date.now() - Math.random() * 60000 };
    }),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const [level, text] = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      setLines((prev) => [{ id: counter++, level, text, time: Date.now() }, ...prev].slice(0, 16));
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card className="pad">
      <CardHeader
        icon={<TerminalSquare size={18} />}
        title="System Diagnostics"
        right={<span className="chip ok"><span className="dot blink" /> LIVE</span>}
      />
      <div className="log">
        {lines.map((l) => (
          <div className={`line ${l.level}`} key={l.id}>
            <span className="t">{formatTime(l.time)}</span>
            <span className="lv">{l.level.toUpperCase()}</span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
