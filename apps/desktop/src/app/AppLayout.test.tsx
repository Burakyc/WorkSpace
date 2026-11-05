import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { navigation } from './navigation';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal('devpath', { getApiConfig: () => new Promise(() => {}) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppLayout', () => {
  it('lists every module in the sidebar, in order', () => {
    renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Ana menü' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Ana Sayfa',
      'Hedefler',
      'Pomodoro',
      'Takvim',
      'Notlar',
      'İngilizce',
      'Öğrenme',
      'Mülakat',
      'Ayarlar',
    ]);
  });

  it('marks only the current page as active', () => {
    renderAt('/goals');

    const nav = screen.getByRole('navigation', { name: 'Ana menü' });
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent)).toEqual(['Hedefler']);
  });

  it('opens a page from the sidebar', () => {
    renderAt('/');

    fireEvent.click(screen.getByRole('link', { name: 'Takvim' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Takvim' })).toBeInTheDocument();
  });

  it('sends unknown paths to the home page', () => {
    renderAt('/nope');

    expect(screen.getByRole('heading', { level: 1, name: 'Ana Sayfa' })).toBeInTheDocument();
  });

  it('starts with a skip link to the content', () => {
    const { container } = renderAt('/');

    const firstFocusable = container.querySelector(
      'a, button, input, [tabindex]:not([tabindex="-1"])',
    );
    expect(firstFocusable).toHaveTextContent('İçeriğe geç');
    expect(firstFocusable).toHaveAttribute('href', '#content');

    fireEvent.click(firstFocusable!);

    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(screen.getByRole('main')).toHaveAttribute('id', 'content');
  });

  it('has one route per sidebar entry', () => {
    expect(new Set(navigation.map((entry) => entry.path)).size).toBe(navigation.length);
  });

  it.each(
    navigation
      .filter((entry) => entry.emptyState !== undefined)
      .map((entry) => [entry.label, entry]),
  )('%s shows its empty state with a next step', (_label, entry) => {
    renderAt(entry.path);

    expect(screen.getByRole('heading', { level: 1, name: entry.label })).toBeInTheDocument();
    expect(screen.getByText(entry.emptyState!.next)).toBeInTheDocument();
  });
});
