import { Triangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { NAV_ITEMS } from './navItems';
import { APP_META } from '@/config/app.config';
import { sfx } from '@/lib/sound';

export function Rail() {
  const activeView = useStore((s) => s.activeView);
  const setView = useStore((s) => s.setView);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const uploads = useStore((s) => s.uploads);

  const activeCount = uploads.filter(
    (u) => u.status === 'uploading' || u.status === 'processing' || u.status === 'queued',
  ).length;

  const counts: Partial<Record<string, number>> = {
    upload: activeCount || undefined,
    history: uploads.filter((u) => u.status === 'completed').length || undefined,
  };

  return (
    <aside className="rail">
      <div className="brand">
        <div className="mark">
          <Triangle size={20} fill="currentColor" />
        </div>
        <div>
          <div className="title grad-text">UPTOOL</div>
          <div className="ver">{APP_META.codename} · {APP_META.build}</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => {
                setView(item.id);
                if (soundEnabled) sfx.click();
              }}
              onMouseEnter={() => soundEnabled && sfx.hover()}
            >
              <span className="ico">
                <Icon size={19} />
              </span>
              <span className="txt">{item.label}</span>
              {count ? <span className="count">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="rail-foot">
        <div className="core-mini">
          <div className="core-orb" />
          <div className="meta">
            <div style={{ fontWeight: 700, fontSize: 13 }}>AI CORE</div>
            <div className="label" style={{ color: 'hsl(var(--ok))' }}>
              ● OPERATIONAL
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
