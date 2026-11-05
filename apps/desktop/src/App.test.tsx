import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'DevPath Workspace' })).toBeInTheDocument();
  });

  it('shows the Turkish placeholder text', () => {
    render(<App />);

    expect(screen.getByText('Kurulum devam ediyor.')).toBeInTheDocument();
  });
});
