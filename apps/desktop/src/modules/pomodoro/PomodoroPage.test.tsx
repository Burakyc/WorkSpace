import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goal, installFakeGoalsApi, project } from '../goals/testing/fakeGoalsApi';
import { PomodoroProvider, STORAGE_KEY } from './PomodoroContext';
import { PomodoroPage } from './PomodoroPage';
import { startTimer } from './timer';

const MIN = 60_000;
const aspnet = goal({ id: 'a', title: 'Learn ASP.NET Core' });
const english = goal({ id: 'b', title: 'English every day' });
const todo = project({ id: 'p1', goalId: 'a', title: 'Todo API' });
const blog = project({ id: 'p2', goalId: 'a', title: 'Blog API' });
const podcasts = project({ id: 'p3', goalId: 'b', title: 'Podcasts' });

function renderPage() {
  return render(
    <MemoryRouter>
      <PomodoroProvider>
        <PomodoroPage />
      </PomodoroProvider>
    </MemoryRouter>,
  );
}

const goalSelect = () => screen.getByLabelText('Hedef');
const projectSelect = () => screen.getByLabelText('Proje (isteğe bağlı)');
const clock = () => screen.getByRole('timer', { name: 'Kalan süre' });
const optionTexts = (select: HTMLElement) =>
  [...select.querySelectorAll('option')].map((o) => o.textContent);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PomodoroPage start', () => {
  it('disables Start until a goal is chosen', async () => {
    installFakeGoalsApi([aspnet, english]);
    renderPage();

    const start = await screen.findByRole('button', { name: 'Başlat' });
    expect(start).toBeDisabled();
    expect(clock()).toHaveTextContent('25:00');

    fireEvent.change(goalSelect(), { target: { value: 'a' } });

    expect(start).toBeEnabled();
  });

  it("lists only the chosen goal's projects and clears the project when the goal changes", async () => {
    installFakeGoalsApi([aspnet, english], { projects: [todo, blog, podcasts] });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });

    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    expect(optionTexts(projectSelect())).toEqual(['Proje yok', 'Todo API', 'Blog API']);
    fireEvent.change(projectSelect(), { target: { value: 'p2' } });
    fireEvent.change(goalSelect(), { target: { value: 'b' } });

    expect(projectSelect()).toHaveValue('');
    expect(optionTexts(projectSelect())).toEqual(['Proje yok', 'Podcasts']);
  });

  it('starts counting down and locks the pickers', async () => {
    installFakeGoalsApi([aspnet], { projects: [todo] });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    fireEvent.change(projectSelect(), { target: { value: 'p1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(MIN));

    expect(clock()).toHaveTextContent('24:00');
    expect(goalSelect()).toBeDisabled();
    expect(projectSelect()).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      goalId: 'a',
      projectId: 'p1',
    });
  });

  it('sends the user to the goals page when there are no goals', async () => {
    installFakeGoalsApi([]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'Hedeflere git' })).toHaveAttribute(
      'href',
      '/goals',
    );
    expect(screen.getByText('Pomodoro başlatmak için önce bir hedef oluştur.')).toBeInTheDocument();
  });

  it("shows a restored session's goal even when it is no longer active", async () => {
    installFakeGoalsApi([english]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(startTimer(aspnet, null, 25 * MIN, Date.now())),
    );
    renderPage();

    await screen.findByRole('timer');

    expect(goalSelect()).toHaveDisplayValue('Learn ASP.NET Core');
    expect(goalSelect()).toBeDisabled();
  });
});

describe('PomodoroPage controls', () => {
  async function startSession() {
    installFakeGoalsApi([aspnet], { projects: [todo] });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    fireEvent.change(projectSelect(), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
  }

  it('pauses and resumes', async () => {
    await startSession();
    act(() => vi.advanceTimersByTime(5 * MIN));

    fireEvent.click(screen.getByRole('button', { name: 'Duraklat' }));
    act(() => vi.advanceTimersByTime(10 * MIN));
    expect(screen.getByText('Duraklatıldı')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('20:00');

    fireEvent.click(screen.getByRole('button', { name: 'Devam et' }));
    act(() => vi.advanceTimersByTime(MIN));
    expect(clock()).toHaveTextContent('19:00');
    expect(screen.queryByText('Duraklatıldı')).not.toBeInTheDocument();
  });

  it('stops back to idle and keeps the goal and project', async () => {
    await startSession();
    act(() => vi.advanceTimersByTime(3 * MIN));

    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));

    expect(clock()).toHaveTextContent('25:00');
    expect(goalSelect()).toBeEnabled();
    expect(goalSelect()).toHaveValue('a');
    expect(projectSelect()).toHaveValue('p1');
    expect(screen.getByRole('button', { name: 'Başlat' })).toBeEnabled();
  });

  it('finishes after 25 minutes and starts over with "Yeni oturum"', async () => {
    await startSession();

    act(() => vi.advanceTimersByTime(25 * MIN));

    expect(screen.getByText('Süre doldu.')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('00:00');
    fireEvent.click(screen.getByRole('button', { name: 'Yeni oturum' }));
    expect(clock()).toHaveTextContent('25:00');
    expect(goalSelect()).toHaveValue('a');
  });
});
