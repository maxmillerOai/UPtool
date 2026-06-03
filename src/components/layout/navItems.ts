import {
  LayoutDashboard,
  UploadCloud,
  History,
  Server,
  BarChart3,
  Settings2,
} from 'lucide-react';
import type { ViewId } from '@/types';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Command', icon: LayoutDashboard },
  { id: 'upload', label: 'Uplink', icon: UploadCloud },
  { id: 'history', label: 'Archive', icon: History },
  { id: 'hosts', label: 'Hosts', icon: Server },
  { id: 'stats', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Systems', icon: Settings2 },
];
