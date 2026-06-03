import { AnimatePresence } from 'framer-motion';
import { ListChecks, Trash2, PlayCircle, Inbox } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { DropZone } from '@/components/upload/DropZone';
import { QueueItem } from '@/components/upload/QueueItem';
import { UploadTelemetry } from '@/components/upload/UploadTelemetry';

export function UploadView() {
  const uploads = useStore((s) => s.uploads);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const startQueued = useStore((s) => s.startQueued);

  const queueItems = uploads.filter((u) => u.status !== 'completed');
  const hasTerminal = uploads.some(
    (u) => u.status === 'completed' || u.status === 'failed' || u.status === 'cancelled',
  );
  const completed = uploads.filter((u) => u.status === 'completed');

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Uplink Terminal</h1>
          <div className="sub">Transmit payloads across the host constellation</div>
        </div>
      </div>

      <div className="grid" style={{ gap: 'var(--space-5)' }}>
        <DropZone />

        <UploadTelemetry uploads={uploads} />

        <Card className="pad" scan={queueItems.some((u) => u.status === 'uploading')}>
          <CardHeader
            icon={<ListChecks size={18} />}
            title="Transfer Queue"
            right={
              <div className="row" style={{ gap: 8 }}>
                <span className="chip info">
                  <span className="dot" />
                  {queueItems.length} active
                </span>
                <button
                  className="btn sm ghost"
                  onClick={startQueued}
                  disabled={!queueItems.some((u) => u.status === 'queued')}
                >
                  <PlayCircle size={15} /> Resume
                </button>
                <button className="btn sm ghost danger" onClick={clearCompleted} disabled={!hasTerminal}>
                  <Trash2 size={15} /> Clear
                </button>
              </div>
            }
          />
          {queueItems.length === 0 ? (
            <div className="empty">
              <div className="ico">
                <Inbox size={28} />
              </div>
              <div>
                <b>Queue is empty</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Drop files above to begin transmission.
                </div>
              </div>
            </div>
          ) : (
            <div className="stack">
              <AnimatePresence mode="popLayout">
                {queueItems.map((item) => (
                  <QueueItem key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {completed.length > 0 && (
          <Card className="pad">
            <CardHeader
              icon={<ListChecks size={18} />}
              title={`Completed · ${completed.length}`}
            />
            <div className="stack">
              <AnimatePresence mode="popLayout">
                {completed.slice(0, 12).map((item) => (
                  <QueueItem key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
