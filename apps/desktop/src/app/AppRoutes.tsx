import { Navigate, Route, Routes } from 'react-router';
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
