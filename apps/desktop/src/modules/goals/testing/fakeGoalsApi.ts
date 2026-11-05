import { vi } from 'vitest';
import type {
  Goal,
  GoalInput,
  GoalProgress,
  Project,
  ProjectCreateInput,
} from '../../../shared/api/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status === 400 ? 'application/problem+json' : 'application/json' },
  });

const notFound = () => json({ title: 'Not Found' }, 404);

/**
 * An in-memory stand-in for the goal, progress and project endpoints: stubs window.devpath and fetch.
 * Mirrors the API rules the UI relies on (order, required titles, https links, archive/restore).
 */
export function installFakeGoalsApi(
  initialGoals: Goal[] = [],
  options: { progress?: GoalProgress[]; projects?: Project[] } = {},
) {
  const goals = initialGoals.map((g) => ({ ...g }));
  const projects = (options.projects ?? []).map((p) => ({ ...p }));
  let created = 0;
  const nextCreatedAt = () => `2030-01-01T00:00:${String(++created).padStart(2, '0')}Z`;

  const listGoals = () => [
    ...goals.filter((g) => !g.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ...goals.filter((g) => g.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  ];

  const titleError = (title: string): Record<string, string[]> =>
    title.trim() === '' ? { title: ['Başlık gerekli.'] } : {};
  const urlError = (url: string | null): Record<string, string[]> =>
    url !== null && !url.startsWith('https://')
      ? { url: ['Bağlantı https:// ile başlayan geçerli bir adres olmalı.'] }
      : {};
  const goalError = (goal: Goal | undefined): Record<string, string[]> =>
    !goal
      ? { goalId: ['Hedef bulunamadı.'] }
      : goal.archived
        ? { goalId: ['Arşivlenmiş bir hedefe proje eklenemez.'] }
        : {};
  const problem = (errors: Record<string, string[]>) =>
    Object.keys(errors).length > 0 ? json({ errors }, 400) : undefined;

  function goalsRoute(
    method: string,
    id: string | undefined,
    action: string | undefined,
    body: unknown,
    includeArchived: boolean,
  ) {
    if (method === 'GET' && id === 'progress') {
      return json(
        listGoals().map(
          (g) =>
            options.progress?.find((p) => p.goalId === g.id) ?? {
              goalId: g.id,
              completedSessions: 0,
              totalMinutes: 0,
              percent: g.targetPomodoros === null ? null : 0,
            },
        ),
      );
    }
    if (method === 'GET' && id === undefined) {
      return json(includeArchived ? listGoals() : listGoals().filter((g) => !g.archived));
    }
    const input = body as GoalInput;
    if (method === 'POST' && id === undefined) {
      const invalid = problem(titleError(input.title));
      if (invalid) return invalid;
      const newGoal: Goal = {
        id: `goal-${created + 1}`,
        title: input.title.trim(),
        description: input.description,
        targetPomodoros: input.targetPomodoros,
        archived: false,
        createdAt: nextCreatedAt(),
      };
      goals.push(newGoal);
      return json(newGoal, 201);
    }
    const goal = goals.find((g) => g.id === id);
    if (!goal) return notFound();
    if (method === 'PUT') {
      const invalid = problem(titleError(input.title));
      if (invalid) return invalid;
      Object.assign(goal, {
        title: input.title.trim(),
        description: input.description,
        targetPomodoros: input.targetPomodoros,
      });
      return json(goal);
    }
    if (action === 'archive' || action === 'restore') {
      goal.archived = action === 'archive';
      return json(goal);
    }
    return json({ title: 'Unexpected request' }, 500);
  }

  function projectsRoute(
    method: string,
    id: string | undefined,
    action: string | undefined,
    body: unknown,
    includeArchived: boolean,
  ) {
    if (method === 'GET' && id === undefined) {
      const ordered = [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return json(includeArchived ? ordered : ordered.filter((p) => !p.archived));
    }
    const input = body as ProjectCreateInput;
    if (method === 'POST' && id === undefined) {
      const goal = goals.find((g) => g.id === input.goalId);
      const invalid = problem({
        ...titleError(input.title),
        ...urlError(input.url),
        ...goalError(goal),
      });
      if (invalid) return invalid;
      const newProject: Project = {
        id: `project-${created + 1}`,
        goalId: input.goalId,
        title: input.title.trim(),
        url: input.url,
        archived: false,
        createdAt: nextCreatedAt(),
      };
      projects.push(newProject);
      return json(newProject, 201);
    }
    const project = projects.find((p) => p.id === id);
    if (!project) return notFound();
    if (method === 'PUT') {
      const invalid = problem({ ...titleError(input.title), ...urlError(input.url) });
      if (invalid) return invalid;
      Object.assign(project, { title: input.title.trim(), url: input.url });
      return json(project);
    }
    if (action === 'archive' || action === 'restore') {
      project.archived = action === 'archive';
      return json(project);
    }
    return json({ title: 'Unexpected request' }, 500);
  }

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname, searchParams } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    const [, , resource, rawId, action] = pathname.split('/');
    const id = rawId === undefined ? undefined : decodeURIComponent(rawId);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const route = resource === 'projects' ? projectsRoute : goalsRoute;
    return Promise.resolve(route(method, id, action, body, includeArchived));
  });

  const openExternal = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve());
  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
    openExternal,
  });
  vi.stubGlobal('fetch', fetchFn);
  return { goals, projects, fetchFn, openExternal };
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

export function project(
  overrides: Partial<Project> & Pick<Project, 'id' | 'goalId' | 'title'>,
): Project {
  return { url: null, archived: false, createdAt: '2026-11-05T10:00:00Z', ...overrides };
}
