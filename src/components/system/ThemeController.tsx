import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { THEME_PRESETS } from '@/config/themes.config';

/**
 * Applies the active theme preset and motion/scanline preferences to the
 * document root. Renders nothing.
 */
export function ThemeController() {
  const themeId = useStore((s) => s.settings.themeId);
  const reducedMotion = useStore((s) => s.settings.reducedMotion);

  useEffect(() => {
    const theme = THEME_PRESETS.find((t) => t.id === themeId) ?? THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--c-primary', theme.primary);
    root.style.setProperty('--c-secondary', theme.secondary);
    root.style.setProperty('--c-tertiary', theme.tertiary);
  }, [themeId]);

  useEffect(() => {
    document.documentElement.classList.toggle('rm', reducedMotion);
  }, [reducedMotion]);

  return null;
}
