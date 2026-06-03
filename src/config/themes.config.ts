import type { ThemePreset } from '@/types';

/**
 * Theme presets. Each defines three accent channels expressed as HSL triplets
 * ("h s% l%") so we can compose alpha-blended neon glows in CSS via
 * `hsl(var(--accent) / <alpha>)`.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cryo-ice',
    name: 'Cryo Ice',
    primary: '189 94% 55%',
    secondary: '231 80% 66%',
    tertiary: '291 90% 65%',
  },
  {
    id: 'plasma-burn',
    name: 'Plasma Burn',
    primary: '14 90% 58%',
    secondary: '330 90% 60%',
    tertiary: '45 96% 58%',
  },
  {
    id: 'bio-flux',
    name: 'Bio Flux',
    primary: '152 76% 50%',
    secondary: '174 84% 50%',
    tertiary: '96 70% 55%',
  },
  {
    id: 'void-violet',
    name: 'Void Violet',
    primary: '266 90% 66%',
    secondary: '291 90% 65%',
    tertiary: '210 90% 62%',
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    primary: '43 96% 56%',
    secondary: '25 95% 58%',
    tertiary: '57 90% 60%',
  },
];

export const DEFAULT_THEME_ID = 'cryo-ice';
