import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../../app/AppRoutes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goal, installFakeGoalsApi, project } from '../goals/testing/fakeGoalsApi';
import { CYCLE_KEY, PomodoroProvider, STORAGE_KEY } from './PomodoroContext';
import { LAST_KEY, PomodoroPage } from './PomodoroPage';
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

    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));

    expect(await screen.findByRole('button', { name: 'Başlat' })).toBeInTheDocument();
    expect(clock()).toHaveTextContent('25:00');
    expect(goalSelect()).toBeEnabled();
    expect(goalSelect()).toHaveValue('a');
    expect(projectSelect()).toHaveValue('p1');
    expect(screen.getByRole('button', { name: 'Başlat' })).toBeEnabled();
  });

  it('finishes after 25 minutes and offers to save', async () => {
    await startSession();

    act(() => vi.advanceTimersByTime(25 * MIN));

    expect(screen.getByText('Süre doldu.')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('00:00');
    expect(screen.getByRole('form', { name: 'Oturumu kaydet' })).toBeInTheDocument();
  });
});

describe('PomodoroPage saving', () => {
  const aspnet20 = goal({ id: 'a', title: 'Learn ASP.NET Core', targetPomodoros: 20 });

  async function finishSession(options: { failSessions?: boolean } = {}) {
    const api = installFakeGoalsApi([aspnet20], { projects: [todo], ...options });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    fireEvent.change(projectSelect(), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(25 * MIN));
    vi.useRealTimers();
    return api;
  }

  it('saves a finished session with its note and shows the new progress', async () => {
    const api = await finishSession();

    fireEvent.change(screen.getByLabelText('Not (isteğe bağlı)'), {
      target: { value: 'DI scopes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Kaydedildi · Learn ASP.NET Core: 1 / 20 pomodoro · %5'),
    ).toBeInTheDocument();
    expect(api.sessions).toEqual([
      expect.objectContaining({
        goalId: 'a',
        projectId: 'p1',
        durationMinutes: 25,
        completed: true,
        note: 'DI scopes',
      }),
    ]);
    const saved = api.sessions[0]!;
    expect(Date.parse(saved.endedAt) - Date.parse(saved.startedAt)).toBe(25 * MIN);
    expect(clock()).toHaveTextContent('25:00');
    expect(goalSelect()).toHaveValue('a');
  });

  it('saves an empty note as null', async () => {
    const api = await finishSession();

    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await screen.findByText(/^Kaydedildi/);
    expect(api.sessions[0]?.note).toBeNull();
  });

  it('keeps the finished session when saving fails', async () => {
    await finishSession({ failSessions: true });

    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Oturum kaydedilemedi. Tekrar dene.',
    );
    expect(screen.getByText('Süre doldu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  });
});

describe('PomodoroPage stopping early', () => {
  const aspnet20 = goal({ id: 'a', title: 'Learn ASP.NET Core', targetPomodoros: 20 });

  async function runFor(ms: number, options: { failSessions?: boolean } = {}) {
    const api = installFakeGoalsApi([aspnet20], options);
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    // The fake clock keeps moving with real time, so the jump below stays in effect while the save is awaited.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(ms));
    return api;
  }

  const sessionRequests = (api: ReturnType<typeof installFakeGoalsApi>) =>
    api.fetchFn.mock.calls.filter(([url]) => String(url).endsWith('/api/sessions'));

  it('saves the focused minutes as not completed', async () => {
    const api = await runFor(10 * MIN + 30_000);

    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));

    expect(
      await screen.findByText('Kaydedildi · Learn ASP.NET Core: 0 / 20 pomodoro · %0'),
    ).toBeInTheDocument();
    expect(api.sessions).toEqual([
      expect.objectContaining({ goalId: 'a', durationMinutes: 10, completed: false, note: null }),
    ]);
    expect(clock()).toHaveTextContent('25:00');
  });

  it('does not save a session under one minute', async () => {
    const api = await runFor(40_000);

    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));

    expect(await screen.findByRole('button', { name: 'Başlat' })).toBeInTheDocument();
    expect(sessionRequests(api)).toHaveLength(0);
    expect(screen.queryByText(/^Kaydedildi/)).not.toBeInTheDocument();
  });

  it('keeps the timer running when saving fails', async () => {
    await runFor(5 * MIN, { failSessions: true });

    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Oturum kaydedilemedi. Tekrar dene.',
    );
    expect(screen.getByRole('button', { name: 'Duraklat' })).toBeInTheDocument();
  });
});

describe('PomodoroPage tags', () => {
  const aspnet20 = goal({ id: 'a', title: 'Learn ASP.NET Core', targetPomodoros: 20 });

  async function startWithTags() {
    const api = installFakeGoalsApi([aspnet20], { tags: ['efcore'] });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    const tagField = screen.getByLabelText('Etiketler (isteğe bağlı)');
    fireEvent.change(tagField, { target: { value: '#DI' } });
    fireEvent.keyDown(tagField, { key: 'Enter' });
    fireEvent.change(tagField, { target: { value: 'API' } });
    fireEvent.keyDown(tagField, { key: 'Enter' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    return { api };
  }

  it('suggests earlier tags, locks chosen tags while running and saves them', async () => {
    const { api } = await startWithTags();

    expect(screen.queryByLabelText('Etiketler (isteğe bağlı)')).toBeNull();
    expect(screen.queryByRole('button', { name: '#di etiketini kaldır' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ tags: ['di', 'api'] });

    act(() => vi.advanceTimersByTime(25 * MIN));
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await screen.findByText(/^Kaydedildi/);
    expect(api.sessions[0]?.tags).toEqual(['di', 'api']);
  });

  it('lets the save form change the tags', async () => {
    const { api } = await startWithTags();
    act(() => vi.advanceTimersByTime(25 * MIN));

    fireEvent.click(screen.getByRole('button', { name: '#api etiketini kaldır' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await screen.findByText(/^Kaydedildi/);
    expect(api.sessions[0]?.tags).toEqual(['di']);
  });

  it('offers earlier tags while idle', async () => {
    installFakeGoalsApi([aspnet20], { tags: ['efcore', 'di'] });
    const { container } = renderPage();
    await screen.findByRole('button', { name: 'Başlat' });

    expect(
      [...container.querySelectorAll('datalist option')].map((o) => o.getAttribute('value')),
    ).toEqual(['#efcore', '#di']);
  });
});

describe('PomodoroPage focus length', () => {
  it('uses the configured focus length', async () => {
    installFakeGoalsApi([goal({ id: 'a', title: 'Learn ASP.NET Core' })], {
      settings: {
        focusMinutes: 50,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
      },
    });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    expect(clock()).toHaveTextContent('50:00');
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });

    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(49 * MIN));
    expect(clock()).toHaveTextContent('01:00');
    act(() => vi.advanceTimersByTime(MIN));

    expect(screen.getByText('Süre doldu.')).toBeInTheDocument();
  });
});

describe('PomodoroPage breaks', () => {
  const learn = goal({ id: 'a', title: 'Learn ASP.NET Core' });

  async function open(longBreakInterval = 4) {
    const api = installFakeGoalsApi([learn], {
      settings: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval },
    });
    renderPage();
    await screen.findByRole('button', { name: 'Başlat' });
    fireEvent.change(goalSelect(), { target: { value: 'a' } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    return api;
  }

  async function completeFocus() {
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(25 * MIN));
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByRole('button', { name: /Molaya başla|Uzun molaya başla/ });
  }

  it('offers a short break after a saved focus session', async () => {
    await open();

    await completeFocus();

    expect(screen.getByRole('button', { name: 'Molaya başla (5 dk)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Molayı atla' })).toBeInTheDocument();
  });

  it('runs a break that is never saved', async () => {
    const api = await open();
    await completeFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Molaya başla (5 dk)' }));
    expect(clock()).toHaveTextContent('05:00');
    expect(screen.getByText('Mola')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Molayı bitir' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5 * MIN));

    expect(screen.getByText('Mola bitti.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Oturumu kaydet' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tamam' }));
    expect(screen.getByRole('button', { name: 'Başlat' })).toBeInTheDocument();
    expect(api.sessions).toHaveLength(1);
  });

  it('offers the long break every interval and resets the cycle when it is taken', async () => {
    await open(2);
    await completeFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Molayı atla' }));

    await completeFocus();

    expect(screen.getByRole('button', { name: 'Uzun molaya başla (15 dk)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Uzun molaya başla (15 dk)' }));
    expect(screen.getByText('Uzun mola')).toBeInTheDocument();
    expect(localStorage.getItem(CYCLE_KEY)).toBe('0');
  });

  it('does not count a stopped session toward the long break', async () => {
    await open(2);
    await completeFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Molayı atla' }));

    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));
    act(() => vi.advanceTimersByTime(5 * MIN));
    fireEvent.click(screen.getByRole('button', { name: 'Durdur' }));
    await screen.findByText(/^Kaydedildi/);

    expect(screen.queryByRole('button', { name: /mola/i })).toBeNull();
    expect(localStorage.getItem(CYCLE_KEY)).toBe('1');
  });
});

describe('PomodoroPage shortcut', () => {
  const pressShortcut = () =>
    fireEvent.keyDown(document.body, { key: 'P', ctrlKey: true, shiftKey: true });

  function renderApp(goals = [aspnet, english]) {
    const api = installFakeGoalsApi(goals, { projects: [todo, blog, podcasts] });
    render(
      <MemoryRouter initialEntries={['/english']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    return api;
  }

  it('remembers the selection of a started session', async () => {
    installFakeGoalsApi([aspnet], { projects: [todo] });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Hedef'), { target: { value: 'a' } });
    fireEvent.change(projectSelect(), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }));

    expect(JSON.parse(localStorage.getItem(LAST_KEY)!)).toEqual({
      goalId: 'a',
      projectId: 'p1',
      tags: [],
    });
  });

  it('starts with the last goal, project and tags from another page', async () => {
    localStorage.setItem(LAST_KEY, JSON.stringify({ goalId: 'a', projectId: 'p1', tags: ['di'] }));
    renderApp();

    pressShortcut();

    expect(await screen.findByRole('button', { name: 'Duraklat' })).toBeInTheDocument();
    // The state is stored in an effect, which may run after the button appears.
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
        status: 'running',
        kind: 'focus',
        goalId: 'a',
        projectId: 'p1',
        tags: ['di'],
      }),
    );
    expect(goalSelect()).toHaveValue('a');
  });

  it('stops a running session like Durdur', async () => {
    localStorage.setItem(LAST_KEY, JSON.stringify({ goalId: 'a', projectId: null, tags: [] }));
    const api = renderApp();
    pressShortcut();
    await screen.findByRole('button', { name: 'Duraklat' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    act(() => vi.advanceTimersByTime(3 * MIN));

    pressShortcut();

    expect(await screen.findByRole('button', { name: 'Başlat' })).toBeInTheDocument();
    expect(api.sessions).toEqual([
      expect.objectContaining({ goalId: 'a', durationMinutes: 3, completed: false }),
    ]);
  });

  it.each([
    ['no last selection', null],
    ['an archived last goal', JSON.stringify({ goalId: 'gone', projectId: null, tags: [] })],
  ])('with %s, focuses the goal picker and starts nothing', async (_name, stored) => {
    if (stored) localStorage.setItem(LAST_KEY, stored);
    renderApp();

    pressShortcut();

    const picker = await screen.findByLabelText('Hedef');
    await vi.waitFor(() => expect(picker).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Başlat' })).toBeDisabled();
  });
});
