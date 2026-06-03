import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Backdrop } from '@/components/background/Backdrop';
import { ParticleField } from '@/components/background/ParticleField';
import { ThemeController } from '@/components/system/ThemeController';
import { ToastStack } from '@/components/system/ToastStack';
import { Rail } from '@/components/layout/Rail';
import { TopBar } from '@/components/layout/TopBar';
import { DashboardView } from '@/views/DashboardView';
import { UploadView } from '@/views/UploadView';
import { HistoryView } from '@/views/HistoryView';
import { HostsView } from '@/views/HostsView';
import { StatsView } from '@/views/StatsView';
import { SettingsView } from '@/views/SettingsView';
import type { ViewId } from '@/types';

const VIEWS: Record<ViewId, () => JSX.Element> = {
  dashboard: DashboardView,
  upload: UploadView,
  history: HistoryView,
  hosts: HostsView,
  stats: StatsView,
  settings: SettingsView,
};

export default function App() {
  const activeView = useStore((s) => s.activeView);
  const particlesEnabled = useStore((s) => s.settings.particlesEnabled);
  const scanlinesEnabled = useStore((s) => s.settings.scanlinesEnabled);
  const refreshBackendHosts = useStore((s) => s.refreshBackendHosts);
  const ActiveView = VIEWS[activeView];

  // Discover backend plugin hosts on startup and poll periodically so newly
  // pushed plugins (and the bridge coming online) appear without a reload.
  useEffect(() => {
    void refreshBackendHosts();
    const id = window.setInterval(() => void refreshBackendHosts(), 20000);
    return () => window.clearInterval(id);
  }, [refreshBackendHosts]);

  return (
    <div className={scanlinesEnabled ? 'scanlines' : undefined}>
      <ThemeController />
      <Backdrop />
      <ParticleField enabled={particlesEnabled} />

      <div className="shell">
        <Rail />
        <div className="viewport">
          <TopBar />
          <main className="view-scroll">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <ActiveView />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <ToastStack />
    </div>
  );
}
