import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  GraduationCap,
  House,
  Languages,
  MessagesSquare,
  NotebookPen,
  Settings,
  Target,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** One sidebar item and its page. A module replaces `element` when it is built. */
export interface NavEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  element?: ReactNode;
}

export const navigation: readonly NavEntry[] = [
  { path: '/', label: 'Ana Sayfa', icon: House },
  { path: '/goals', label: 'Hedefler', icon: Target },
  { path: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { path: '/calendar', label: 'Takvim', icon: CalendarDays },
  { path: '/notes', label: 'Notlar', icon: NotebookPen },
  { path: '/english', label: 'İngilizce', icon: Languages },
  { path: '/learning', label: 'Öğrenme', icon: GraduationCap },
  { path: '/interview', label: 'Mülakat', icon: MessagesSquare },
  { path: '/settings', label: 'Ayarlar', icon: Settings },
];

export function pageFor(entry: NavEntry): ReactNode {
  return entry.element ?? <h1>{entry.label}</h1>;
}
