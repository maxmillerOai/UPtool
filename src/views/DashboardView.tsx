import { Boxes, Network, Atom, Gauge } from 'lucide-react';
import { useStore, computeStats } from '@/store/useStore';
import { useTelemetry } from '@/hooks/useTelemetry';
import { formatBytes } from '@/lib/format';
import { AICoreStatus } from '@/components/dashboard/AICoreStatus';
import { MetricTile } from '@/components/dashboard/MetricTile';
import { ThroughputGraph } from '@/components/dashboard/ThroughputGraph';
import { TransferRadar } from '@/components/dashboard/TransferRadar';
import { HostHealth } from '@/components/dashboard/HostHealth';
import { ConnectionMeter } from '@/components/dashboard/ConnectionMeter';
import { SystemDiagnostics } from '@/components/dashboard/SystemDiagnostics';
import { StorageOverview } from '@/components/dashboard/StorageOverview';
import { NetworkMap } from '@/components/dashboard/NetworkMap';
import { CountUp } from '@/components/ui/CountUp';

export function DashboardView() {
  const uploads = useStore((s) => s.uploads);
  const stats = computeStats(uploads);

  const active = uploads.filter((u) => u.status === 'uploading' || u.status === 'processing');
  const liveThroughput = active.reduce((a, u) => a + u.speed, 0);
  const t = useTelemetry(liveThroughput, active.length > 0);

  const successRate =
    stats.totalUploads > 0 ? (stats.successCount / stats.totalUploads) * 100 : 100;

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Command Center</h1>
          <div className="sub">Realtime orchestration of the uplink constellation</div>
        </div>
        <span className="chip ok">
          <span className="dot blink" /> ALL SYSTEMS NOMINAL
        </span>
      </div>

      <div className="dash">
        <div className="col-8">
          <AICoreStatus t={t} active={active.length} />
        </div>
        <div className="col-4">
          <MetricTile
            icon={<Boxes size={16} />}
            label="Upload Matrix"
            value={<CountUp value={stats.successCount} />}
            unit="objects"
            spark={t.cores}
          />
        </div>

        <div className="col-3">
          <MetricTile
            icon={<Network size={16} />}
            label="Network Activity"
            value={<CountUp value={t.throughput[t.throughput.length - 1]} decimals={0} />}
            unit="MB/s"
            trend={12.4}
          />
        </div>
        <div className="col-3">
          <MetricTile
            icon={<Atom size={16} />}
            label="Quantum Transfer"
            value={<CountUp value={t.integrity} decimals={2} />}
            unit="% sync"
            trend={0.3}
          />
        </div>
        <div className="col-3">
          <MetricTile
            icon={<Gauge size={16} />}
            label="Performance"
            value={<CountUp value={successRate} decimals={1} />}
            unit="% success"
            trend={successRate >= 95 ? 4.2 : -3.1}
          />
        </div>
        <div className="col-3">
          <MetricTile
            icon={<Boxes size={16} />}
            label="Data Volume"
            value={<CountUp value={stats.totalBytes} format={(n) => formatBytes(n)} />}
            spark={t.throughput.slice(-12)}
          />
        </div>

        <div className="col-7">
          <ThroughputGraph t={t} />
        </div>
        <div className="col-5">
          <TransferRadar uploads={uploads} />
        </div>

        <div className="col-4">
          <HostHealth />
        </div>
        <div className="col-4">
          <ConnectionMeter t={t} />
        </div>
        <div className="col-4">
          <StorageOverview usedBytes={stats.totalBytes} count={stats.successCount} />
        </div>

        <div className="col-7">
          <NetworkMap />
        </div>
        <div className="col-5">
          <SystemDiagnostics />
        </div>
      </div>
    </div>
  );
}
