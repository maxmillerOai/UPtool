import {
  Settings2,
  Palette,
  Sliders,
  Bell,
  Sparkles,
  RotateCcw,
  Server,
  Volume2,
  Database,
} from 'lucide-react';
import { useStore, useHosts } from '@/store/useStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { THEME_PRESETS } from '@/config/themes.config';
import { enabledHosts } from '@/lib/hostRegistry';
import { APP_META } from '@/config/app.config';
import type { Settings } from '@/types';

export function SettingsView() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const reset = useStore((s) => s.resetSettings);
  const clearAll = useStore((s) => s.clearAll);
  const notify = useStore((s) => s.notify);
  const hosts = enabledHosts(useHosts());

  const SwitchRow = ({
    k,
    title,
    desc,
  }: {
    k: keyof Settings;
    title: string;
    desc: string;
  }) => (
    <div className="set-row">
      <div className="info">
        <b>{title}</b>
        <small>{desc}</small>
      </div>
      <Toggle on={!!settings[k]} onChange={(v) => update({ [k]: v } as Partial<Settings>)} label={title} />
    </div>
  );

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1 className="grad-text">Systems Configuration</h1>
          <div className="sub">Tune the command interface to your preference</div>
        </div>
        <button className="btn ghost" onClick={() => { reset(); notify('info', 'Settings restored', 'Defaults reapplied'); }}>
          <RotateCcw size={16} /> Restore Defaults
        </button>
      </div>

      <div className="settings-grid">
        <Card className="pad">
          <CardHeader icon={<Palette size={18} />} title="Theme Matrix" />
          <p className="muted" style={{ fontSize: 13, marginBottom: 'var(--space-4)' }}>
            Select the chromatic signature for the entire interface.
          </p>
          <div className="themes">
            {THEME_PRESETS.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${settings.themeId === t.id ? 'on' : ''}`}
                onClick={() => update({ themeId: t.id })}
                style={{
                  background: `linear-gradient(135deg, hsl(${t.primary}), hsl(${t.secondary}) 55%, hsl(${t.tertiary}))`,
                }}
                aria-label={t.name}
              >
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="pad">
          <CardHeader icon={<Sparkles size={18} />} title="Visual Effects" />
          <SwitchRow k="particlesEnabled" title="Particle Field" desc="Animated constellation background" />
          <SwitchRow k="scanlinesEnabled" title="Scanline Overlay" desc="CRT-style ambient scanlines" />
          <SwitchRow k="reducedMotion" title="Reduced Motion" desc="Minimize animations for comfort" />
        </Card>

        <Card className="pad">
          <CardHeader icon={<Sliders size={18} />} title="Transfer Engine" />
          <div className="set-row">
            <div className="info">
              <b>Default Host</b>
              <small>Route new uploads through this node</small>
            </div>
            <select
              className="select"
              style={{ width: 180 }}
              value={settings.defaultHostId}
              onChange={(e) => update({ defaultHostId: e.target.value })}
            >
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="set-row">
            <div className="info">
              <b>Max Concurrent Transfers</b>
              <small>Parallel uplink channels: {settings.maxConcurrent}</small>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={settings.maxConcurrent}
              onChange={(e) => update({ maxConcurrent: Number(e.target.value) })}
              style={{ width: 140, accentColor: 'hsl(var(--c-primary))' }}
            />
          </div>
          <SwitchRow k="autoRetry" title="Auto-Retry" desc="Automatically re-attempt failed transfers" />
          <div className="set-row">
            <div className="info">
              <b>Max Retries</b>
              <small>Attempts before marking failed: {settings.maxRetries}</small>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={settings.maxRetries}
              onChange={(e) => update({ maxRetries: Number(e.target.value) })}
              style={{ width: 140, accentColor: 'hsl(var(--c-primary))' }}
              disabled={!settings.autoRetry}
            />
          </div>
          <SwitchRow k="autoCopyOnComplete" title="Auto-Copy Link" desc="Copy URL to clipboard on completion" />
        </Card>

        <Card className="pad">
          <CardHeader icon={<Bell size={18} />} title="Notifications & Audio" />
          <SwitchRow k="notificationsEnabled" title="Notifications" desc="System toasts and signal log" />
          <SwitchRow k="soundEnabled" title="Sound Effects" desc="Procedural interface audio cues" />
          <div className="row" style={{ gap: 10, marginTop: 'var(--space-3)', color: 'var(--ink-faint)' }}>
            <Volume2 size={15} />
            <span style={{ fontSize: 12 }}>Audio is generated procedurally — no external assets.</span>
          </div>
        </Card>

        <Card className="pad">
          <CardHeader icon={<Database size={18} />} title="Data & Storage" />
          <div className="set-row">
            <div className="info">
              <b>Local Persistence</b>
              <small>History, hosts &amp; settings are stored in this browser.</small>
            </div>
            <span className="chip ok"><span className="dot" /> ACTIVE</span>
          </div>
          <div className="set-row">
            <div className="info">
              <b>Purge All Data</b>
              <small>Remove every queued and historical record.</small>
            </div>
            <button
              className="btn sm danger"
              onClick={() => {
                clearAll();
                notify('warning', 'Workspace cleared', 'All upload records removed');
              }}
            >
              Purge
            </button>
          </div>
        </Card>

        <Card className="pad" holo={false}>
          <CardHeader icon={<Server size={18} />} title="System Information" />
          <div className="kv"><span className="k">Platform</span><span className="val">{APP_META.name}</span></div>
          <div className="kv"><span className="k">Codename</span><span className="val">{APP_META.codename}</span></div>
          <div className="kv"><span className="k">Version</span><span className="val">{APP_META.version}</span></div>
          <div className="kv"><span className="k">Build</span><span className="val">{APP_META.build}</span></div>
          <div className="kv"><span className="k">Active Hosts</span><span className="val">{hosts.length}</span></div>
          <div className="kv"><span className="k">Engine</span><span className="val" style={{ color: 'hsl(var(--ok))' }}>OPERATIONAL</span></div>
        </Card>

        <Card className="pad">
          <CardHeader icon={<Settings2 size={18} />} title="Theme Preview" />
          <div className="stack">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn primary">Primary</button>
              <button className="btn">Secondary</button>
              <span className="chip info"><span className="dot" /> Info</span>
              <span className="chip ok"><span className="dot" /> OK</span>
              <span className="chip err"><span className="dot" /> Error</span>
            </div>
            <div className="bar"><i style={{ transform: 'scaleX(0.72)' }} /></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
