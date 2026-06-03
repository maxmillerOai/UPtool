import { motion } from 'framer-motion';
import {
  X,
  RotateCcw,
  Copy,
  ExternalLink,
  FileIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import type { UploadItem } from '@/types';
import { useStore, useHosts } from '@/store/useStore';
import { findHost } from '@/lib/hostRegistry';
import { formatBytes, formatSpeed, formatDuration, fileExtension } from '@/lib/format';
import { statusMeta } from '@/lib/status';
import { sfx } from '@/lib/sound';

export function QueueItem({ item }: { item: UploadItem }) {
  const cancelUpload = useStore((s) => s.cancelUpload);
  const retryUpload = useStore((s) => s.retryUpload);
  const removeUpload = useStore((s) => s.removeUpload);
  const notify = useStore((s) => s.notify);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const host = findHost(useHosts(), item.hostId);
  const meta = statusMeta(item.status);

  const active = item.status === 'uploading' || item.status === 'processing';
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      if (soundEnabled) sfx.click();
      notify('success', 'Link copied', text);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className={`qitem ${item.status}`}
    >
      {active && <div className="scan-beam" />}
      <div className="thumb">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" />
        ) : (
          <>
            <FileIcon size={18} style={{ position: 'absolute', opacity: 0.25 }} />
            <span className="ext">{fileExtension(item.name)}</span>
          </>
        )}
      </div>

      <div className="mid">
        <div className="fname" title={item.name}>
          {item.name}
        </div>
        <div className="fmeta">
          <span>{formatBytes(item.size)}</span>
          <span style={{ color: 'hsl(var(--c-primary))' }}>{host?.name ?? item.hostId}</span>
          <span className="status-pill" style={{ color: meta.color }}>
            {item.status === 'uploading' && <Loader2 size={12} className="spin-ico" />}
            {item.status === 'processing' && <Loader2 size={12} className="spin-ico" />}
            {item.status === 'completed' && <CheckCircle2 size={12} />}
            {item.status === 'failed' && <AlertTriangle size={12} />}
            {item.status === 'cancelled' && <Ban size={12} />}
            {meta.label}
          </span>
          {active && (
            <>
              <span>{formatSpeed(item.speed)}</span>
              <span>ETA {formatDuration(item.eta)}</span>
            </>
          )}
          {item.error && <span style={{ color: 'hsl(var(--err))' }}>{item.error}</span>}
        </div>

        {(active || item.status === 'queued') && (
          <div className="progress-line">
            <div className="bar" style={{ flex: 1 }}>
              <i style={{ transform: `scaleX(${Math.max(0.02, item.progress / 100)})` }} />
            </div>
            <span className="pct">{Math.round(item.progress)}%</span>
          </div>
        )}

        {item.status === 'completed' && item.result && (
          <div className="result-url">
            <a href={item.result.url} target="_blank" rel="noreferrer" title={item.result.url}>
              {item.result.url}
            </a>
            <button className="iconbtn" data-tip="Copy" onClick={() => copy(item.result!.url)}>
              <Copy size={14} />
            </button>
            <a
              className="iconbtn"
              data-tip="Open"
              href={item.result.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>

      <div className="actions">
        {(item.status === 'failed' || item.status === 'cancelled') && (
          <button className="iconbtn" data-tip="Retry" onClick={() => retryUpload(item.id)}>
            <RotateCcw size={16} />
          </button>
        )}
        {active && (
          <button className="iconbtn danger" data-tip="Abort" onClick={() => cancelUpload(item.id)}>
            <Ban size={16} />
          </button>
        )}
        <button className="iconbtn danger" data-tip="Remove" onClick={() => removeUpload(item.id)}>
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
