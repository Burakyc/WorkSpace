import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_POMODORO_SETTINGS } from '../../shared/api/types';
import { todayLocal } from '../calendar/monthGrid';
import { goal, installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { PomodoroProvider, STORAGE_KEY } from '../pomodoro/PomodoroContext';
import { HomePage } from './HomePage';

const aspnet = goal({ id: 'a', title: 'Learn ASP.NET Core', targetPomodoros: 20 });
const english = goal({ id: 'b', title: 'English every day' });
const old = goal({ id: 'c', title: 'Old goal', archived: true });

function renderPage() {
  return render(
    <MemoryRouter>
      <PomodoroProvider>
        <HomePage />
      </PomodoroProvider>
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage today card', () => {
  it("shows today's pomodoros and the active goals with progress", async () => {
    installFakeGoalsApi([aspnet, english, old], {
      progress: [{ goalId: 'a', completedSessions: 7, totalMinutes: 175, percent: 35 }],
      days: {
        [todayLocal()]: { completedSessions: 2, totalMinutes: 50, sessions: [], goals: [] },
      },
    });

    renderPage();

    const today = card('Bugün');
    expect(await within(today).findByText('Bugün 2 pomodoro · 50 dk')).toBeInTheDocument();
    const goals = within(today).getByRole('list', { name: 'Aktif hedefler' });
    expect(within(goals).getByText('Learn ASP.NET Core')).toBeInTheDocument();
    expect(within(goals).getByText('7 / 20 pomodoro · %35')).toBeInTheDocument();
    expect(within(goals).getByText('0 pomodoro · 0 dk')).toBeInTheDocument();
    expect(within(today).queryByText('Old goal')).not.toBeInTheDocument();
  });

  it('starts a focus timer for the picked goal in two clicks', async () => {
    installFakeGoalsApi([aspnet, english], {
      settings: { ...DEFAULT_POMODORO_SETTINGS, focusMinutes: 50 },
    });
    renderPage();

    const today = card('Bugün');
    const start = await within(today).findByRole('button', { name: 'Başlat' });
    expect(start).toBeDisabled();
    fireEvent.change(within(today).getByLabelText('Hedef'), { target: { value: 'b' } });
    fireEvent.click(start);

    expect(within(today).getByText(/Pomodoro sürüyor\./)).toBeInTheDocument();
    expect(within(today).getByRole('link', { name: "Pomodoro'ya git" })).toHaveAttribute(
      'href',
      '/pomodoro',
    );
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      status: string;
      goalId: string;
      startedAt: number;
      endsAt: number;
    };
    expect(stored.status).toBe('running');
    expect(stored.goalId).toBe('b');
    expect(stored.endsAt - stored.startedAt).toBe(50 * 60_000);
  });

  it('links to the goals page when there are no goals', async () => {
    installFakeGoalsApi([]);
    renderPage();

    const today = card('Bugün');
    expect(await within(today).findByRole('link', { name: 'Hedeflere git' })).toHaveAttribute(
      'href',
      '/goals',
    );
    expect(within(today).queryByRole('button', { name: 'Başlat' })).not.toBeInTheDocument();
  });

  it('shows an error inside the card when today cannot be loaded', async () => {
    installFakeGoalsApi([aspnet], { failDays: true });
    renderPage();

    expect(
      await within(card('Bugün')).findByText('Bugünün özeti yüklenemedi.'),
    ).toBeInTheDocument();
  });
});
