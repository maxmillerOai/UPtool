import type { UploadStatus } from '@/types';

interface StatusMeta {
  label: string;
  /** chip/color class suffix */
  tone: 'ok' | 'warn' | 'err' | 'info' | 'idle';
  color: string;
}

export function statusMeta(status: UploadStatus): StatusMeta {
  switch (status) {
    case 'completed':
      return { label: 'Complete', tone: 'ok', color: 'hsl(var(--ok))' };
    case 'uploading':
      return { label: 'Transmitting', tone: 'info', color: 'hsl(var(--c-primary))' };
    case 'processing':
      return { label: 'Processing', tone: 'info', color: 'hsl(var(--c-tertiary))' };
    case 'queued':
      return { label: 'Queued', tone: 'idle', color: 'var(--ink-dim)' };
    case 'paused':
      return { label: 'Paused', tone: 'warn', color: 'hsl(var(--warn))' };
    case 'failed':
      return { label: 'Failed', tone: 'err', color: 'hsl(var(--err))' };
    case 'cancelled':
      return { label: 'Aborted', tone: 'warn', color: 'hsl(var(--warn))' };
    default:
      return { label: status, tone: 'idle', color: 'var(--ink-dim)' };
  }
}
