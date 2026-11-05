import { vi } from 'vitest';
import type { Goal, GoalInput, GoalProgress } from '../../../shared/api/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status === 400 ? 'application/problem+json' : 'application/json' },
  });

/**
 * An in-memory stand-in for the goal endpoints: stubs window.devpath and fetch.
 * Mirrors the API's rules that the UI relies on (order, title required, archive/restore).
 */
export function installFakeGoalsApi(
  initial: Goal[] = [],
  options: { progress?: GoalProgress[] } = {},
) {
  const goals = initial.map((goal) => ({ ...goal }));
  let created = 0;

  const list = () => [
    ...goals.filter((g) => !g.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ...goals.filter((g) => g.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  ];

  const validate = (input: GoalInput) =>
    input.title.trim() === '' ? json({ errors: { title: ['Başlık gerekli.'] } }, 400) : undefined;

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname, searchParams } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as GoalInput) : undefined;
    const [, , , rawId, action] = pathname.split('/');
    const id = rawId === undefined ? undefined : decodeURIComponent(rawId);
    const goal = goals.find((g) => g.id === id);

    if (method === 'GET' && pathname === '/api/goals/progress') {
      return Promise.resolve(
        json(
          list().map(
            (g) =>
              options.progress?.find((p) => p.goalId === g.id) ?? {
                goalId: g.id,
                completedSessions: 0,
                totalMinutes: 0,
                percent: g.targetPomodoros === null ? null : 0,
              },
          ),
        ),
      );
    }
    if (method === 'GET' && pathname === '/api/goals') {
      const all = list();
      return Promise.resolve(
        json(searchParams.get('includeArchived') === 'true' ? all : all.filter((g) => !g.archived)),
      );
    }
    if (method === 'POST' && pathname === '/api/goals' && body) {
      const invalid = validate(body);
      if (invalid) return Promise.resolve(invalid);
      created++;
      const newGoal: Goal = {
        id: `new-${created}`,
        title: body.title.trim(),
        description: body.description,
        targetPomodoros: body.targetPomodoros,
        archived: false,
        createdAt: `2030-01-01T00:00:0${created}Z`,
      };
      goals.push(newGoal);
      return Promise.resolve(json(newGoal, 201));
    }
    if (!goal) {
      return Promise.resolve(json({ title: 'Not Found' }, 404));
    }
    if (method === 'PUT' && body) {
      const invalid = validate(body);
      if (invalid) return Promise.resolve(invalid);
      Object.assign(goal, {
        title: body.title.trim(),
        description: body.description,
        targetPomodoros: body.targetPomodoros,
      });
      return Promise.resolve(json(goal));
    }
    if (method === 'POST' && (action === 'archive' || action === 'restore')) {
      goal.archived = action === 'archive';
      return Promise.resolve(json(goal));
    }
    return Promise.resolve(json({ title: 'Unexpected request' }, 500));
  });

  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
  });
  vi.stubGlobal('fetch', fetchFn);
  return { goals, fetchFn };
}

export function goal(overrides: Partial<Goal> & Pick<Goal, 'id' | 'title'>): Goal {
  return {
    description: null,
    targetPomodoros: null,
    archived: false,
    createdAt: '2026-11-05T09:00:00Z',
    ...overrides,
  };
}
