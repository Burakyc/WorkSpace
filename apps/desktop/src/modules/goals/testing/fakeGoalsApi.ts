import { vi } from 'vitest';
import type {
  DayDetail,
  DayNote,
  FeedResponse,
  Goal,
  GoalInput,
  GoalProgress,
  NoteKind,
  NoteNode,
  NoteSearchResult,
  PomodoroSettings,
  Project,
  ProjectCreateInput,
  Session,
  SessionInput,
} from '../../../shared/api/types';
import { DEFAULT_POMODORO_SETTINGS } from '../../../shared/api/types';
import { buildMonthGrid } from '../../calendar/monthGrid';
import { descendantIds } from '../../notes/treeHelpers';

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
  options: {
    progress?: GoalProgress[];
    projects?: Project[];
    failSessions?: boolean;
    settings?: PomodoroSettings;
    tags?: string[];
    /** Completed pomodoros per local date (YYYY-MM-DD) for GET /api/calendar; 25 minutes each. */
    calendar?: Record<string, number>;
    failCalendar?: boolean;
    /** GET /api/days/{date} answers; days not listed are empty. Logs are kept per date. */
    days?: Record<
      string,
      Omit<DayDetail, 'date' | 'timeZone' | 'log' | 'notes'> & { notes?: DayNote[] }
    >;
    logs?: Record<string, string>;
    failDays?: boolean;
    /** The notes tree; mutated by the notes routes. */
    notes?: NoteNode[];
    failNotes?: boolean;
    /** Page blocks by note id; pages not listed are empty. */
    contents?: Record<string, unknown[]>;
    failContentSave?: boolean;
    /** GET /api/notes/search answers by query; queries not listed find nothing. */
    search?: Record<string, NoteSearchResult[]>;
    failSearch?: boolean;
    /** GET /api/home/feed answer; missing by default. */
    feed?: FeedResponse;
    failFeed?: boolean;
  } = {},
) {
  const goals = initialGoals.map((g) => ({ ...g }));
  const projects = (options.projects ?? []).map((p) => ({ ...p }));
  const sessions: Session[] = [];
  let settings: PomodoroSettings = { ...(options.settings ?? DEFAULT_POMODORO_SETTINGS) };
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
        listGoals().map((g) => options.progress?.find((p) => p.goalId === g.id) ?? progressOf(g)),
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

  function progressOf(g: Goal): GoalProgress {
    const done = sessions.filter((x) => x.goalId === g.id && x.completed);
    return {
      goalId: g.id,
      completedSessions: done.length,
      totalMinutes: done.reduce((sum, x) => sum + x.durationMinutes, 0),
      percent:
        g.targetPomodoros === null
          ? null
          : Math.min(100, Math.floor((done.length * 100) / g.targetPomodoros)),
    };
  }

  function settingsRoute(method: string, body: unknown) {
    if (method === 'GET') return json({ pomodoro: settings });
    const input = body as PomodoroSettings;
    if (input.focusMinutes < 1 || input.focusMinutes > 120) {
      return json(
        { errors: { focusMinutes: ['Odak süresi 1 ile 120 dakika arasında olmalı.'] } },
        400,
      );
    }
    settings = { ...input };
    return json(settings);
  }

  function sessionsRoute(method: string, id: string | undefined, body: unknown) {
    if (method === 'GET' && id === 'tags') {
      const used = sessions.flatMap((x) => x.tags);
      return json([...new Set([...used, ...(options.tags ?? [])])]);
    }
    if (options.failSessions) return json({ title: 'Server error' }, 500);
    const input = body as SessionInput;
    if (!goals.some((g) => g.id === input.goalId)) {
      return json({ errors: { goalId: ['Hedef bulunamadı.'] } }, 400);
    }
    const session: Session = {
      id: `session-${sessions.length + 1}`,
      ...input,
      tags: input.tags.map((t) => t.replace(/^#+/, '').toLowerCase()),
    };
    sessions.push(session);
    return json(session, 201);
  }

  function calendarRoute(month: string, timeZone: string) {
    if (options.failCalendar) return json({ title: 'Server error' }, 500);
    const days = buildMonthGrid(month)
      .flat()
      .map(({ date }) => {
        const count = options.calendar?.[date] ?? 0;
        return { date, completedSessions: count, totalMinutes: count * 25 };
      });
    return json({ month, timeZone, days });
  }

  const logs: Record<string, string> = { ...options.logs };

  function daysRoute(method: string, date: string, timeZone: string, body: unknown) {
    if (options.failDays) return json({ title: 'Server error' }, 500);
    if (method === 'PUT') {
      const text = ((body as { text: string | null }).text ?? '').trimEnd();
      if (text.length > 10_000) {
        return json({ errors: { text: ['Günlük en fazla 10.000 karakter olabilir.'] } }, 400);
      }
      logs[date] = text;
      return json({ text });
    }
    const empty = { completedSessions: 0, totalMinutes: 0, sessions: [], goals: [] };
    return json({
      date,
      timeZone,
      notes: [],
      ...(options.days?.[date] ?? empty),
      log: logs[date] ?? '',
    });
  }

  const notes = (options.notes ?? []).map((n) => ({ ...n }));
  const contents: Record<string, unknown[]> = { ...options.contents };

  const lastOrder = (parentId: string | null) =>
    Math.max(-1, ...notes.filter((n) => n.parentId === parentId).map((n) => n.order)) + 1;

  function notesRoute(
    method: string,
    id: string | undefined,
    action: string | undefined,
    body: unknown,
    query: string,
  ) {
    if (options.failNotes) return json({ title: 'Server error' }, 500);
    if (method === 'GET' && id === undefined) {
      return json([...notes].sort((a, b) => a.order - b.order));
    }
    if (method === 'GET' && id === 'search') {
      if (options.failSearch) return json({ title: 'Server error' }, 500);
      return json(options.search?.[query] ?? []);
    }
    if (method === 'POST' && id === undefined) {
      const input = body as { parentId: string | null; kind: NoteKind; title: string };
      const invalid = problem(titleError(input.title));
      if (invalid) return invalid;
      const node: NoteNode = {
        id: `note-${notes.length + 1}-${created + 1}`,
        parentId: input.parentId,
        kind: input.kind,
        title: input.title.trim(),
        order: lastOrder(input.parentId),
        createdAt: nextCreatedAt(),
        updatedAt: '',
      };
      node.updatedAt = node.createdAt;
      notes.push(node);
      return json(node, 201);
    }
    const node = notes.find((n) => n.id === id);
    if (!node || id === undefined) return notFound();
    if (method === 'DELETE') {
      const doomed = descendantIds(notes, id).add(id);
      notes.splice(0, notes.length, ...notes.filter((n) => !doomed.has(n.id)));
      return new Response(null, { status: 204 });
    }
    if (action === 'content') {
      if (method === 'GET') return json({ blocks: contents[id] ?? [] });
      if (options.failContentSave) return json({ title: 'Server error' }, 500);
      contents[id] = (body as { blocks: unknown[] }).blocks;
      return json(node);
    }
    if (method === 'PUT') {
      const { title } = body as { title: string };
      const invalid = problem(titleError(title));
      if (invalid) return invalid;
      node.title = title.trim();
      return json(node);
    }
    if (action === 'move') {
      const { parentId } = body as { parentId: string | null };
      if (parentId !== null && (parentId === id || descendantIds(notes, id).has(parentId))) {
        return json(
          { errors: { parentId: ['Bir öğe kendi içine veya alt öğelerinden birine taşınamaz.'] } },
          400,
        );
      }
      if (node.parentId !== parentId) {
        node.order = lastOrder(parentId);
        node.parentId = parentId;
      }
      return json(node);
    }
    if (action === 'shift') {
      const { offset } = body as { offset: number };
      const siblings = notes
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order);
      const index = siblings.indexOf(node) + offset;
      const neighbour = siblings[index];
      if (neighbour) {
        [siblings[index], siblings[index - offset]] = [node, neighbour];
        siblings.forEach((n, i) => (n.order = i));
      }
      return json(node);
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
    if (resource === 'home' && id === 'feed') {
      if (options.failFeed) return Promise.resolve(json({ title: 'Server error' }, 500));
      return Promise.resolve(
        json(options.feed ?? { status: 'missing', generatedAt: null, items: [], errors: [] }),
      );
    }
    if (resource === 'sessions') return Promise.resolve(sessionsRoute(method, id, body));
    if (resource === 'settings') return Promise.resolve(settingsRoute(method, body));
    if (resource === 'notes') {
      return Promise.resolve(notesRoute(method, id, action, body, searchParams.get('q') ?? ''));
    }
    if (resource === 'days' && id !== undefined) {
      return Promise.resolve(daysRoute(method, id, searchParams.get('timeZone') ?? '', body));
    }
    if (resource === 'calendar') {
      return Promise.resolve(
        calendarRoute(searchParams.get('month') ?? '', searchParams.get('timeZone') ?? ''),
      );
    }
    const route = resource === 'projects' ? projectsRoute : goalsRoute;
    return Promise.resolve(route(method, id, action, body, includeArchived));
  });

  const openExternal = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve());
  const beforeClose = new Set<() => Promise<void>>();
  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
    openExternal,
    onBeforeClose: (callback: () => Promise<void>) => {
      beforeClose.add(callback);
      return () => beforeClose.delete(callback);
    },
  });
  /** What main's close handshake does: run every registered callback. */
  const closeApp = () => Promise.all([...beforeClose].map((callback) => callback()));
  vi.stubGlobal('fetch', fetchFn);
  return {
    goals,
    projects,
    sessions,
    logs,
    notes,
    contents,
    closeApp,
    fetchFn,
    openExternal,
    settings: () => settings,
  };
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
