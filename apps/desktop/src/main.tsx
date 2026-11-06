import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { installErrorListeners } from './shared/errors/errorListeners';

installErrorListeners();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
