import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DaySession } from '../../shared/api/types';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { CalendarPage } from './CalendarPage';
import { DayPage } from './DayPage';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 5, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const at = (hour: number, minute = 0) => new Date(2026, 10, 3, hour, minute).toISOString();

function session(overrides: Partial<DaySession> & Pick<DaySession, 'id'>): DaySession {
  return {
    startedAt: at(9),
    endedAt: at(9, 25),
    durationMinutes: 25,
    completed: true,
    goalId: 'g1',
    goalTitle: 'Learn ASP.NET Core',
    projectId: null,
    projectTitle: null,
    tags: [],
    note: null,
    ...overrides,
  };
}

const tuesday = {
  completedSessions: 2,
  totalMinutes: 50,
  sessions: [
    session({
      id: 's1',
      projectId: 'p1',
      projectTitle: 'Todo API',
      tags: ['di'],
      note: 'DI chapter done',
    }),
    session({ id: 's2', startedAt: at(10), endedAt: at(10, 25) }),
    session({
      id: 's3',
      startedAt: at(11),
      endedAt: at(11, 10),
      durationMinutes: 10,
      completed: false,
    }),
  ],
  goals: [{ goalId: 'g1', title: 'Learn ASP.NET Core', completedSessions: 2, totalMinutes: 50 }],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/calendar/:date" element={<DayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DayPage', () => {
  it('opens a day from the month view', async () => {
    installFakeGoalsApi([], { calendar: { '2026-11-03': 2 }, days: { '2026-11-03': tuesday } });
    renderAt('/calendar');

    fireEvent.click(await screen.findByRole('link', { name: '3 Kasım 2026, 2 pomodoro' }));

    expect(
      screen.getByRole('heading', { level: 1, name: '3 Kasım 2026 Salı' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('2 pomodoro · 50 dk')).toHaveLength(2); // summary and goal
  });

  it('lists the sessions and the goals of the day', async () => {
    installFakeGoalsApi([], { days: { '2026-11-03': tuesday } });
    renderAt('/calendar/2026-11-03');

    const sessions = within(await screen.findByRole('region', { name: 'Oturumlar' }));
    const items = sessions.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('09:00–09:25');
    expect(items[0]).toHaveTextContent('Learn ASP.NET Core · Todo API');
    expect(items[0]).toHaveTextContent('#di');
    expect(items[0]).toHaveTextContent('DI chapter done');
    expect(items[1]).not.toHaveTextContent('Erken durduruldu');
    expect(items[2]).toHaveTextContent('11:00–11:10');
    expect(items[2]).toHaveTextContent('Erken durduruldu');

    const goals = within(screen.getByRole('region', { name: 'Hedefler' }));
    expect(goals.getByRole('listitem')).toHaveTextContent('Learn ASP.NET Core2 pomodoro · 50 dk');
  });

  it('steps between days and goes back to the same month', async () => {
    const { fetchFn } = installFakeGoalsApi([], { days: { '2026-11-03': tuesday } });
    renderAt('/calendar/2026-10-31');
    await screen.findByText('Bu gün oturum yok.');

    fireEvent.click(screen.getByRole('link', { name: 'Sonraki gün' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '1 Kasım 2026 Pazar' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Önceki gün' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '31 Ekim 2026 Cumartesi' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Takvime dön' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Ekim 2026' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchFn.mock.calls
          .map(([url]) => new URL(String(url)).pathname)
          .filter((p) => p.startsWith('/api/days')),
      ).toEqual(['/api/days/2026-10-31', '/api/days/2026-11-01', '/api/days/2026-10-31']),
    );
  });

  it('sends an invalid date back to the calendar', () => {
    installFakeGoalsApi();
    renderAt('/calendar/2026-02-30');

    expect(screen.getByRole('heading', { level: 1, name: 'Takvim' })).toBeInTheDocument();
  });

  it('shows an empty day and a load error', async () => {
    installFakeGoalsApi();
    const { unmount } = renderAt('/calendar/2026-11-04');

    expect(await screen.findByText('Bu gün oturum yok.')).toBeInTheDocument();
    expect(screen.getByText('Bu gün tamamlanan pomodoro yok.')).toBeInTheDocument();
    unmount();

    installFakeGoalsApi([], { failDays: true });
    renderAt('/calendar/2026-11-04');
    expect(await screen.findByRole('alert')).toHaveTextContent('Gün yüklenemedi.');
  });

  it('lists the notes of the day', async () => {
    installFakeGoalsApi([], {
      days: {
        '2026-11-03': {
          ...tuesday,
          notes: [
            { id: 'n1', title: 'DI', created: true },
            { id: 'n2', title: 'Middleware', created: false },
          ],
        },
      },
    });
    renderAt('/calendar/2026-11-03');

    const notes = within(await screen.findByRole('region', { name: 'Notlar' }));
    expect(notes.getByRole('link', { name: 'DI' })).toHaveAttribute('href', '/notes/n1');
    expect(notes.getByRole('link', { name: 'Middleware' }).parentElement).toHaveTextContent(
      'Düzenlendi',
    );
    expect(notes.getByRole('link', { name: 'DI' }).parentElement).toHaveTextContent('Oluşturuldu');
  });

  it('says when a day has no notes', async () => {
    installFakeGoalsApi([]);
    renderAt('/calendar/2026-11-03');
    expect(await screen.findByText('Bu gün not yok.')).toBeInTheDocument();
  });

  it('saves the daily log', async () => {
    const { fetchFn, logs } = installFakeGoalsApi([], { logs: { '2026-11-03': 'Old text' } });
    renderAt('/calendar/2026-11-03');
    const field = await screen.findByLabelText('Bu gün hakkında notların');
    const save = screen.getByRole('button', { name: 'Kaydet' });
    expect(field).toHaveValue('Old text');
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'Read the DI chapter.\n' } });
    expect(screen.getByRole('status')).toHaveTextContent('Kaydedilmemiş değişiklik var.');
    fireEvent.click(save);

    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
    expect(field).toHaveValue('Read the DI chapter.');
    expect(save).toBeDisabled();
    expect(logs['2026-11-03']).toBe('Read the DI chapter.');
    const put = fetchFn.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[1]?.body).toBe(JSON.stringify({ text: 'Read the DI chapter.\n' }));
  });

  it('shows the field error and keeps the text', async () => {
    installFakeGoalsApi();
    renderAt('/calendar/2026-11-03');
    const field = await screen.findByLabelText('Bu gün hakkında notların');
    const tooLong = 'a'.repeat(10_001);

    fireEvent.change(field, { target: { value: tooLong } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Günlük en fazla 10.000 karakter olabilir.'),
    ).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue(tooLong);
    expect(screen.getByRole('status')).toHaveTextContent('Kaydedilmemiş değişiklik var.');
  });
});
