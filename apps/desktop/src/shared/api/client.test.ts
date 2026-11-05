import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, TOKEN_HEADER } from './client';

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
});
