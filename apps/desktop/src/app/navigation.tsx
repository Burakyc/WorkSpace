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
import { CalendarPage } from '../modules/calendar/CalendarPage';
import { ContentEmptyPage } from '../modules/content/ContentEmptyPage';
import { GoalsPage } from '../modules/goals/GoalsPage';
import { NotesPage } from '../modules/notes/NotesPage';
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
    element: <CalendarPage />,
  },
  { path: '/notes', label: 'Notlar', icon: NotebookPen, element: <NotesPage /> },
  {
    path: '/english',
    label: 'İngilizce',
    icon: Languages,
    element: (
      <ContentEmptyPage
        type="vocab"
        icon={Languages}
        title="İngilizce"
        description="Kendi eklediğin kelime ve ifade kartları burada olacak."
      />
    ),
  },
  {
    path: '/learning',
    label: 'Öğrenme',
    icon: GraduationCap,
    element: (
      <ContentEmptyPage
        type="lesson"
        icon={GraduationCap}
        title="Öğrenme"
        description="Konulara ve parçalara bölünmüş derslerin burada olacak."
      />
    ),
  },
  {
    path: '/interview',
    label: 'Mülakat',
    icon: MessagesSquare,
    element: (
      <ContentEmptyPage
        type="interview"
        icon={MessagesSquare}
        title="Mülakat"
        description="Mülakat soruların ve cevapların kart olarak burada olacak."
      />
    ),
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
