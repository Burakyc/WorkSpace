import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { CalendarPage } from './CalendarPage';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 5, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/calendar']}>
      <CalendarPage />
    </MemoryRouter>,
  );

const calendarRequests = (fetchFn: ReturnType<typeof installFakeGoalsApi>['fetchFn']) =>
  fetchFn.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.pathname === '/api/calendar')
    .map((url) => url.searchParams.get('month'));

describe('CalendarPage', () => {
  it('shows the month in Turkish with Monday-first weekdays', async () => {
    installFakeGoalsApi();

    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: 'Kasım 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Pzt',
      'Sal',
      'Çar',
      'Per',
      'Cum',
      'Cmt',
      'Paz',
    ]);
    expect(
      await screen.findByRole('link', { name: '1 Kasım 2026, pomodoro yok' }),
    ).toBeInTheDocument();
  });

  it('shows the count with its shading', async () => {
    installFakeGoalsApi([], { calendar: { '2026-11-03': 3 } });

    renderPage();

    const link = await screen.findByRole('link', { name: '3 Kasım 2026, 3 pomodoro' });
    expect(link).toHaveTextContent('3');
    expect(link).toHaveAttribute('href', '/calendar/2026-11-03');
    expect(link.closest('td')?.className).toMatch(/level2/);
  });

  it('marks today', async () => {
    installFakeGoalsApi();

    renderPage();

    const today = await screen.findByRole('link', { name: /^5 Kasım 2026/ });
    expect(today.closest('td')).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('link', { name: /^6 Kasım 2026/ }).closest('td')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('moves between months and back to today', async () => {
    const { fetchFn } = installFakeGoalsApi([], { calendar: { '2026-10-12': 1 } });
    renderPage();
    const today = screen.getByRole('button', { name: 'Bugün' });
    expect(today).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Önceki ay' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Ekim 2026' })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: '12 Ekim 2026, 1 pomodoro' }),
    ).toBeInTheDocument();
    expect(today).toBeEnabled();

    fireEvent.click(today);
    expect(screen.getByRole('heading', { level: 2, name: 'Kasım 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki ay' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Aralık 2026' })).toBeInTheDocument();
    await waitFor(() =>
      expect(calendarRequests(fetchFn)).toEqual(['2026-11', '2026-10', '2026-11', '2026-12']),
    );
  });

  it('shows an error when the calendar cannot load', async () => {
    installFakeGoalsApi([], { failCalendar: true });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Takvim yüklenemedi.');
  });
});
