import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const calendarRequests = (fetchFn: ReturnType<typeof installFakeGoalsApi>['fetchFn']) =>
  fetchFn.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.pathname === '/api/calendar')
    .map((url) => url.searchParams.get('month'));

describe('CalendarPage', () => {
  it('shows the month in Turkish with Monday-first weekdays', async () => {
    installFakeGoalsApi();

    render(<CalendarPage />);

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
      await screen.findByRole('cell', { name: '1 Kasım 2026, pomodoro yok' }),
    ).toBeInTheDocument();
  });

  it('shows the count with its shading', async () => {
    installFakeGoalsApi([], { calendar: { '2026-11-03': 3 } });

    render(<CalendarPage />);

    const cell = await screen.findByRole('cell', { name: '3 Kasım 2026, 3 pomodoro' });
    expect(cell).toHaveTextContent('3');
    expect(cell.className).toMatch(/level2/);
  });

  it('marks today', async () => {
    installFakeGoalsApi();

    render(<CalendarPage />);

    expect(await screen.findByRole('cell', { name: /^5 Kasım 2026/ })).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(screen.getByRole('cell', { name: /^6 Kasım 2026/ })).not.toHaveAttribute('aria-current');
  });

  it('moves between months and back to today', async () => {
    const { fetchFn } = installFakeGoalsApi([], { calendar: { '2026-10-12': 1 } });
    render(<CalendarPage />);
    const today = screen.getByRole('button', { name: 'Bugün' });
    expect(today).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Önceki ay' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Ekim 2026' })).toBeInTheDocument();
    expect(
      await screen.findByRole('cell', { name: '12 Ekim 2026, 1 pomodoro' }),
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

    render(<CalendarPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Takvim yüklenemedi.');
  });
});
