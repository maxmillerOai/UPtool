import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Bell, Activity, Gauge, Radio, CheckCheck, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime, formatSpeed } from '@/lib/format';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function TopBar() {
  const now = useClock();
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const setView = useStore((s) => s.setView);
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  const clearNotifications = useStore((s) => s.clearNotifications);
  const uploads = useStore((s) => s.uploads);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;
  const activeUploads = uploads.filter(
    (u) => u.status === 'uploading' || u.status === 'processing',
  );
  const totalSpeed = activeUploads.reduce((acc, u) => acc + u.speed, 0);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <header className="topbar">
      <div className="searchbox search">
        <Search size={16} />
        <input
          className="input"
          placeholder="Search transmissions, links, hosts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setView('history');
          }}
        />
      </div>

      <div className="spacer" />

      <div className="tele">
        <div className="tele-item">
          <span className="v">
            <Activity size={13} style={{ verticalAlign: '-2px' }} /> {activeUploads.length}
          </span>
          <span className="k">Active</span>
        </div>
        <div className="tele-item">
          <span className="v">
            <Gauge size={13} style={{ verticalAlign: '-2px' }} /> {formatSpeed(totalSpeed)}
          </span>
          <span className="k">Throughput</span>
        </div>
        <div className="tele-item">
          <span className="v" style={{ color: 'hsl(var(--ok))' }}>
            <Radio size={13} style={{ verticalAlign: '-2px' }} /> LINK
          </span>
          <span className="k">Uplink</span>
        </div>
      </div>

      <div className="clock mono">
        {now.toLocaleTimeString([], { hour12: false })}
        <span style={{ color: 'var(--ink-faint)' }}> UTC{-now.getTimezoneOffset() / 60 >= 0 ? '+' : ''}
          {-now.getTimezoneOffset() / 60}
        </span>
      </div>

      <div style={{ position: 'relative' }} ref={panelRef}>
        <button
          className="iconbtn"
          aria-label="Notifications"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) markAllRead();
          }}
        >
          <Bell size={18} />
          {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <Card className="notif-panel pad" holo={false} edge>
                <div className="row between" style={{ marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: 14, letterSpacing: '0.12em' }}>SIGNAL LOG</h3>
                  <div className="row" style={{ gap: 6 }}>
                    <button
                      className="iconbtn"
                      data-tip="Mark all read"
                      onClick={markAllRead}
                      style={{ width: 30, height: 30 }}
                    >
                      <CheckCheck size={15} />
                    </button>
                    <button
                      className="iconbtn danger"
                      data-tip="Clear all"
                      onClick={clearNotifications}
                      style={{ width: 30, height: 30 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="notif-list">
                  {notifications.length === 0 && (
                    <div className="empty" style={{ padding: 'var(--space-5)' }}>
                      <span className="muted">No signals received.</span>
                    </div>
                  )}
                  {notifications.map((n) => (
                    <div key={n.id} className={`notif-row ${n.read ? '' : 'unread'}`}>
                      <span
                        className="dot"
                        style={{
                          background:
                            n.kind === 'error'
                              ? 'hsl(var(--err))'
                              : n.kind === 'warning'
                                ? 'hsl(var(--warn))'
                                : n.kind === 'success'
                                  ? 'hsl(var(--ok))'
                                  : 'hsl(var(--c-primary))',
                          boxShadow: '0 0 8px currentColor',
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                        {n.message && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {n.message}
                          </div>
                        )}
                        <div className="label" style={{ marginTop: 2 }}>
                          {formatRelativeTime(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
