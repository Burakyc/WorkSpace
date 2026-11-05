import { HashRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
