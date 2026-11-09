import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, TOKEN_HEADER } from './client';
import { clearErrors, recentErrors } from '../errors/errorLog';
import { DEFAULT_REMINDER_SETTINGS } from './types';

const config = { baseUrl: 'http://127.0.0.1:4321', token: 'secret' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const goal = {
  id: 'g 1',
  title: 'Learn DI',
  description: null,
  targetPomodoros: 20,
  archived: false,
  createdAt: '2026-11-05T09:00:00+00:00',
};

describe('createApiClient', () => {
  it('calls the base URL with the token header', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ status: 'ok', version: '0.0.1' }));

    await createApiClient(config, fetchFn).getHealth();

    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4321/api/health', {
      method: 'GET',
      headers: { [TOKEN_HEADER]: 'secret' },
    });
  });

  it('returns the typed health response', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ status: 'ok', version: '0.0.1' }));

    const health = await createApiClient(config, fetchFn).getHealth();

    expect(health).toEqual({ status: 'ok', version: '0.0.1' });
  });

  it('throws ApiError with the status on a non-2xx response', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json({ title: 'no' }, 401));

    const error = await createApiClient(config, fetchFn)
      .getHealth()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).errors).toBeUndefined();
  });

  it('sends JSON bodies with the token', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(goal, 201));
    const input = { title: 'Learn DI', description: null, targetPomodoros: 20 };

    const created = await createApiClient(config, fetchFn).createGoal(input);

    expect(created).toEqual(goal);
    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4321/api/goals', {
      method: 'POST',
      headers: { [TOKEN_HEADER]: 'secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('uses the goal paths', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json(goal)));
    const client = createApiClient(config, fetchFn);

    await client.listGoals(true);
    await client.updateGoal('g 1', { title: 'x', description: null, targetPomodoros: null });
    await client.archiveGoal('g 1');
    await client.restoreGoal('g 1');

    expect(fetchFn.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`)).toEqual([
      'GET http://127.0.0.1:4321/api/goals?includeArchived=true',
      'PUT http://127.0.0.1:4321/api/goals/g%201',
      'POST http://127.0.0.1:4321/api/goals/g%201/archive',
      'POST http://127.0.0.1:4321/api/goals/g%201/restore',
    ]);
  });

  it('reads field errors from a validation problem', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ title: 'x', errors: { title: ['Başlık gerekli.', 3] } }, 400));

    const error = await createApiClient(config, fetchFn)
      .createGoal({ title: '', description: null, targetPomodoros: null })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).errors).toEqual({ title: ['Başlık gerekli.'] });
  });

  it('uses the project paths and bodies', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json({})));
    const client = createApiClient(config, fetchFn);

    await client.listProjects(true);
    await client.createProject({ goalId: 'g', title: 'Todo API', url: null });
    await client.updateProject('p 1', { title: 'New', url: 'https://github.com/x' });
    await client.archiveProject('p 1');
    await client.restoreProject('p 1');

    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      ['GET http://127.0.0.1:4321/api/projects?includeArchived=true', undefined],
      [
        'POST http://127.0.0.1:4321/api/projects',
        JSON.stringify({ goalId: 'g', title: 'Todo API', url: null }),
      ],
      [
        'PUT http://127.0.0.1:4321/api/projects/p%201',
        JSON.stringify({ title: 'New', url: 'https://github.com/x' }),
      ],
      ['POST http://127.0.0.1:4321/api/projects/p%201/archive', undefined],
      ['POST http://127.0.0.1:4321/api/projects/p%201/restore', undefined],
    ]);
  });

  it('reads goal progress', async () => {
    const progress = [{ goalId: 'g', completedSessions: 7, totalMinutes: 175, percent: 35 }];
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(progress));

    expect(await createApiClient(config, fetchFn).getGoalProgress()).toEqual(progress);
    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4321/api/goals/progress', {
      method: 'GET',
      headers: { [TOKEN_HEADER]: 'secret' },
    });
  });

  it('logs a session', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json({ id: 's' }, 201));
    const input = {
      goalId: 'g',
      projectId: null,
      startedAt: '2026-11-05T09:00:00.000Z',
      endedAt: '2026-11-05T09:25:00.000Z',
      durationMinutes: 25,
      completed: true,
      note: null,
      tags: ['di'],
    };

    await createApiClient(config, fetchFn).createSession(input);

    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4321/api/sessions', {
      method: 'POST',
      headers: { [TOKEN_HEADER]: 'secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('reads tags and reads and saves settings', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json({})));
    const client = createApiClient(config, fetchFn);
    const pomodoro = {
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
      longBreakInterval: 3,
    };

    await client.listTags();
    await client.getSettings();
    await client.savePomodoroSettings(pomodoro);
    await client.saveReminderSettings(DEFAULT_REMINDER_SETTINGS);

    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      ['GET http://127.0.0.1:4321/api/sessions/tags', undefined],
      ['GET http://127.0.0.1:4321/api/settings', undefined],
      ['PUT http://127.0.0.1:4321/api/settings/pomodoro', JSON.stringify(pomodoro)],
      [
        'PUT http://127.0.0.1:4321/api/settings/reminders',
        JSON.stringify(DEFAULT_REMINDER_SETTINGS),
      ],
    ]);
  });

  it('requests a calendar month with the encoded time zone', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json({ days: [] }));

    await createApiClient(config, fetchFn).getCalendar('2026-11', 'Europe/Istanbul');

    expect(fetchFn).toHaveBeenCalledWith(
      'http://127.0.0.1:4321/api/calendar?month=2026-11&timeZone=Europe%2FIstanbul',
      { method: 'GET', headers: { [TOKEN_HEADER]: 'secret' } },
    );
  });

  it('reads a day and saves its log', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json({})));
    const client = createApiClient(config, fetchFn);

    await client.getDay('2026-11-05', 'Europe/Istanbul');
    await client.saveDayLog('2026-11-05', 'Read the DI chapter.');

    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      ['GET http://127.0.0.1:4321/api/days/2026-11-05?timeZone=Europe%2FIstanbul', undefined],
      [
        'PUT http://127.0.0.1:4321/api/days/2026-11-05/log',
        JSON.stringify({ text: 'Read the DI chapter.' }),
      ],
    ]);
  });
  it('sends the notes requests', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation((_url, init) =>
        Promise.resolve(init?.method === 'DELETE' ? new Response(null, { status: 204 }) : json({})),
      );
    const client = createApiClient(config, fetchFn);

    await client.listNotes();
    await client.createNote('p 1', 'page', 'DI');
    await client.renameNote('n 1', 'Dependency injection');
    await client.moveNote('n 1', null);
    await client.shiftNote('n 1', -1);
    await expect(client.deleteNote('n 1')).resolves.toBeUndefined();
    await client.getNoteContent('n 1');
    await client.saveNoteContent('n 1', [{ type: 'paragraph' }]);
    await client.searchNotes('di ömür');

    const base = 'http://127.0.0.1:4321/api/notes';
    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      [`GET ${base}`, undefined],
      [`POST ${base}`, JSON.stringify({ parentId: 'p 1', kind: 'page', title: 'DI' })],
      [`PUT ${base}/n%201`, JSON.stringify({ title: 'Dependency injection' })],
      [`POST ${base}/n%201/move`, JSON.stringify({ parentId: null })],
      [`POST ${base}/n%201/shift`, JSON.stringify({ offset: -1 })],
      [`DELETE ${base}/n%201`, undefined],
      [`GET ${base}/n%201/content`, undefined],
      [`PUT ${base}/n%201/content`, JSON.stringify({ blocks: [{ type: 'paragraph' }] })],
      [`GET ${base}/search?q=di%20%C3%B6m%C3%BCr`, undefined],
    ]);
  });

  it('validates and imports content with the type and the text as it is', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(json({ errors: [], report: null })));
    const client = createApiClient(config, fetchFn);
    const text = '{\n  "type": "vocab"\n}';

    await client.validateImport('vocab', text);
    await client.importContent('interview', text);

    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      ['POST http://127.0.0.1:4321/api/import/validate', JSON.stringify({ type: 'vocab', text })],
      ['POST http://127.0.0.1:4321/api/import', JSON.stringify({ type: 'interview', text })],
    ]);
  });

  it('lists and gets topics and marks items', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json([])));
    const client = createApiClient(config, fetchFn);

    await client.listTopics('vocab');
    await client.getTopic('vocab', 'a b');
    await client.markItem('vocab', 's', 'i 1', 'known');
    await client.markItem('vocab', 's', 'i 1', null);

    const base = 'http://127.0.0.1:4321/api/content/vocab';
    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      [`GET ${base}`, undefined],
      [`GET ${base}/a%20b`, undefined],
      [`PUT ${base}/s/items/i%201/mark`, JSON.stringify({ mark: 'known' })],
      [`PUT ${base}/s/items/i%201/mark`, JSON.stringify({ mark: null })],
    ]);
  });

  it('sends the home requests', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation((_url, init) =>
        Promise.resolve(init?.method === 'DELETE' ? new Response(null, { status: 204 }) : json({})),
      );
    const client = createApiClient(config, fetchFn);

    await client.getFeed();
    await client.listYouTubeChannels();
    await client.addYouTubeChannel('UC123');
    await client.removeYouTubeChannel('UC 1');
    await client.getYouTubeVideos();
    await client.refreshYouTube();
    await client.listOpportunitySites();
    await client.addOpportunitySite('', 'patika.dev');
    await client.removeOpportunitySite('patika.dev');
    await client.getGitHubSettings();
    await client.saveGitHubSettings('octo');
    await client.getGitHubStats();
    await client.refreshGitHub();
    await client.recordVisit('Europe/Istanbul');

    const base = 'http://127.0.0.1:4321/api';
    expect(
      fetchFn.mock.calls.map(([url, init]) => [`${init?.method} ${String(url)}`, init?.body]),
    ).toEqual([
      [`GET ${base}/home/feed`, undefined],
      [`GET ${base}/youtube/channels`, undefined],
      [`POST ${base}/youtube/channels`, JSON.stringify({ input: 'UC123' })],
      [`DELETE ${base}/youtube/channels/UC%201`, undefined],
      [`GET ${base}/youtube/videos`, undefined],
      [`POST ${base}/youtube/refresh`, undefined],
      [`GET ${base}/opportunities/sites`, undefined],
      [`POST ${base}/opportunities/sites`, JSON.stringify({ name: '', url: 'patika.dev' })],
      [`DELETE ${base}/opportunities/sites/patika.dev`, undefined],
      [`GET ${base}/github/settings`, undefined],
      [`PUT ${base}/github/settings`, JSON.stringify({ username: 'octo' })],
      [`GET ${base}/github/stats`, undefined],
      [`POST ${base}/github/refresh`, undefined],
      [`POST ${base}/home/visit?timeZone=Europe%2FIstanbul`, undefined],
    ]);
  });

  it('records failed requests for the developer panel, but not validation answers', async () => {
    clearErrors();
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ title: 'Server Error' }, 500))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({ errors: { title: ['Başlık gerekli.'] } }, 400));
    const client = createApiClient(config, fetchFn);

    await expect(client.getNoteContent('0f8f6d3e-1111-2222-3333-444455556666')).rejects.toThrow();
    await expect(client.listTags()).rejects.toThrow();
    await expect(client.createGoal({ ...goal, title: '' })).rejects.toThrow();

    expect(recentErrors().map(({ kind, path }) => [kind, path])).toEqual([
      ['NetworkError', 'GET /api/sessions/tags'],
      ['HTTP 500', 'GET /api/notes/{…}/content'],
    ]);
  });
});
