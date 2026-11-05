import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  window.location.hash = '';
  // The API status stays "connecting"; ApiStatus.test.tsx covers the rest.
  vi.stubGlobal('devpath', { getApiConfig: () => new Promise(() => {}) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('opens on the home page inside the shell', () => {
    render(<App />);

    expect(screen.getByRole('navigation', { name: 'Ana menü' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Sayfa' })).toBeInTheDocument();
  });

  it('shows the API status', () => {
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('API: bağlanıyor…');
  });
});
