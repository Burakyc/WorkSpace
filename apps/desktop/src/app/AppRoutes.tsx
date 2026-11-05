import { Navigate, Route, Routes } from 'react-router';
import { DayPage } from '../modules/calendar/DayPage';
import { NotesPage } from '../modules/notes/NotesPage';
import { PomodoroProvider } from '../modules/pomodoro/PomodoroContext';
import { AppLayout } from './AppLayout';
import { navigation, pageFor } from './navigation';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <PomodoroProvider>
            <AppLayout />
          </PomodoroProvider>
        }
      >
        {navigation.map((entry) => (
          <Route key={entry.path} path={entry.path} element={pageFor(entry)} />
        ))}
        <Route path="/calendar/:date" element={<DayPage />} />
        <Route path="/notes/:id" element={<NotesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
