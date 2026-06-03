import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AppNotification, NotificationKind } from '@/types';

const ICONS: Record<NotificationKind, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const TOAST_MS = 5200;

/** Ephemeral toasts for the most recent notifications. */
export function ToastStack() {
  const notifications = useStore((s) => s.notifications);
  const dismiss = useStore((s) => s.dismissNotification);
  const [visible, setVisible] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Show only freshly created, unread notifications as toasts.
    const latest = notifications.filter((n) => !n.read).slice(0, 4);
    setVisible(latest);
    if (latest.length === 0) return;
    const timers = latest.map((n) =>
      window.setTimeout(() => {
        setVisible((cur) => cur.filter((c) => c.id !== n.id));
      }, TOAST_MS),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [notifications]);

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {visible.map((n) => {
          const Icon = ICONS[n.kind];
          return (
            <motion.div
              key={n.id}
              className={`toast ${n.kind}`}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              layout
            >
              <div className="ico">
                <Icon size={18} />
              </div>
              <div className="body">
                <b>{n.title}</b>
                {n.message && <p>{n.message}</p>}
              </div>
              <button
                className="iconbtn"
                style={{ width: 28, height: 28 }}
                aria-label="Dismiss"
                onClick={() => {
                  setVisible((cur) => cur.filter((c) => c.id !== n.id));
                  dismiss(n.id);
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
