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
import { GoalsPage } from '../modules/goals/GoalsPage';
import { PomodoroPage } from '../modules/pomodoro/PomodoroPage';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { EmptyState } from '../shared/ui/EmptyState';

/** One sidebar item and its page. A module sets `element` when it is built; until then the empty state shows. */
export interface NavEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  element?: ReactNode;
  emptyState?: { description: string; next: string };
}

export const navigation: readonly NavEntry[] = [
  {
    path: '/',
    label: 'Ana Sayfa',
    icon: House,
    emptyState: {
      description: 'Bugünün özeti, hatırlatmalar ve son değişiklikler burada görünecek.',
      next: 'Başlamak için soldan bir bölüm seç.',
    },
  },
  { path: '/goals', label: 'Hedefler', icon: Target, element: <GoalsPage /> },
  { path: '/pomodoro', label: 'Pomodoro', icon: Timer, element: <PomodoroPage /> },
  {
    path: '/calendar',
    label: 'Takvim',
    icon: CalendarDays,
    emptyState: {
      description: 'Hangi gün ne yaptığını, pomodorolarını ve notlarını burada göreceksin.',
      next: 'Pomodoro oturumların burada otomatik birikecek.',
    },
  },
  {
    path: '/notes',
    label: 'Notlar',
    icon: NotebookPen,
    emptyState: {
      description: 'Klasörler, sayfalar ve alt sayfalarla notların burada olacak.',
      next: 'Not düzenleyici yakında geliyor.',
    },
  },
  {
    path: '/english',
    label: 'İngilizce',
    icon: Languages,
    emptyState: {
      description: 'Kendi eklediğin kelime ve ifade kartları burada olacak.',
      next: "İçerik, prompt kopyalayıp yapay zekâdan aldığın JSON'u yapıştırarak eklenecek.",
    },
  },
  {
    path: '/learning',
    label: 'Öğrenme',
    icon: GraduationCap,
    emptyState: {
      description: 'Konulara ve parçalara bölünmüş derslerin burada olacak.',
      next: 'Dersler JSON içe aktarma ile eklenecek.',
    },
  },
  {
    path: '/interview',
    label: 'Mülakat',
    icon: MessagesSquare,
    emptyState: {
      description: 'Mülakat soruların ve cevapların kart olarak burada olacak.',
      next: 'Sorular JSON içe aktarma ile eklenecek.',
    },
  },
  { path: '/settings', label: 'Ayarlar', icon: Settings, element: <SettingsPage /> },
];

export function pageFor(entry: NavEntry): ReactNode {
  if (entry.element) {
    return entry.element;
  }
  if (entry.emptyState) {
    return <EmptyState icon={entry.icon} title={entry.label} {...entry.emptyState} />;
  }
  return <h1>{entry.label}</h1>;
}
