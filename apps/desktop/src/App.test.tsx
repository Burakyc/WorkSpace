import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  // The API status stays "connecting"; ApiStatus.test.tsx covers the rest.
  vi.stubGlobal('devpath', { getApiConfig: () => new Promise(() => {}) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'DevPath Workspace' })).toBeInTheDocument();
  });

  it('shows the Turkish placeholder text', () => {
    render(<App />);

    expect(screen.getByText('Kurulum devam ediyor.')).toBeInTheDocument();
  });

  it('shows the API status', () => {
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('API: bağlanıyor…');
  });
});
