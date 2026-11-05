import { render, screen } from '@testing-library/react';
import { Target } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows the title as the page heading, what the page is for and what to do next', () => {
    render(
      <EmptyState
        icon={Target}
        title="Hedefler"
        description="Hedeflerin burada listelenecek."
        next="Hedef ekleme bir sonraki adımda geliyor."
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Hedefler' })).toBeInTheDocument();
    expect(screen.getByText('Hedeflerin burada listelenecek.')).toBeInTheDocument();
    expect(screen.getByText('Hedef ekleme bir sonraki adımda geliyor.')).toBeInTheDocument();
  });
});
