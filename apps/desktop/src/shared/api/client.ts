import type {
  ApiConfig,
  AppSettings,
  CalendarMonth,
  DayDetail,
  Goal,
  GoalInput,
  GoalProgress,
  HealthResponse,
  NoteKind,
  NoteNode,
  PomodoroSettings,
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  Session,
  SessionInput,
} from './types';

export const TOKEN_HEADER = 'X-DevPath-Token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
    /** Field errors from a 400 validation problem, keyed by camelCase field name (Turkish messages). */
    readonly errors?: Record<string, string[]>,
  ) {
    super(`API request ${path} failed with status ${status}.`);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  getHealth(): Promise<HealthResponse>;
  listGoals(includeArchived?: boolean): Promise<Goal[]>;
  createGoal(input: GoalInput): Promise<Goal>;
  updateGoal(id: string, input: GoalInput): Promise<Goal>;
  archiveGoal(id: string): Promise<Goal>;
  restoreGoal(id: string): Promise<Goal>;
  getGoalProgress(): Promise<GoalProgress[]>;
  listProjects(includeArchived?: boolean): Promise<Project[]>;
  createProject(input: ProjectCreateInput): Promise<Project>;
  updateProject(id: string, input: ProjectUpdateInput): Promise<Project>;
  archiveProject(id: string): Promise<Project>;
  restoreProject(id: string): Promise<Project>;
  createSession(input: SessionInput): Promise<Session>;
  listTags(): Promise<string[]>;
  getSettings(): Promise<AppSettings>;
  savePomodoroSettings(settings: PomodoroSettings): Promise<PomodoroSettings>;
  /** `timeZone` is an IANA id; sessions are grouped by their local start date in it. */
  getCalendar(month: string, timeZone: string): Promise<CalendarMonth>;
  getDay(date: string, timeZone: string): Promise<DayDetail>;
  /** Saves the free-text daily log; returns the stored (end-trimmed) text. */
  saveDayLog(date: string, text: string): Promise<{ text: string }>;
  listNotes(): Promise<NoteNode[]>;
  createNote(parentId: string | null, kind: NoteKind, title: string): Promise<NoteNode>;
  renameNote(id: string, title: string): Promise<NoteNode>;
  /** Makes the node the last child of `parentId` (null = top level). */
  moveNote(id: string, parentId: string | null): Promise<NoteNode>;
  /** Swaps the node with its previous (-1) or next (1) sibling. */
  shiftNote(id: string, offset: -1 | 1): Promise<NoteNode>;
  /** Deletes the node and everything under it. */
  deleteNote(id: string): Promise<void>;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

// The default reads the global fetch on every call, so a cached client still sees a fetch stubbed later in tests.
export function createApiClient(
  config: ApiConfig,
  fetchFn: typeof fetch = (input, init) => fetch(input, init),
): ApiClient {
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { [TOKEN_HEADER]: config.token };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetchFn(`${config.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new ApiError(response.status, path, await readFieldErrors(response));
    }
    // 204 No Content has no body; only callers typed `void` get it.
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  const goal = (id: string) => `/api/goals/${encodeURIComponent(id)}`;
  const project = (id: string) => `/api/projects/${encodeURIComponent(id)}`;
  const note = (id: string) => `/api/notes/${encodeURIComponent(id)}`;

  return {
    getHealth: () => request<HealthResponse>('GET', '/api/health'),
    listGoals: (includeArchived = false) =>
      request<Goal[]>('GET', `/api/goals?includeArchived=${includeArchived}`),
    createGoal: (input) => request<Goal>('POST', '/api/goals', input),
    updateGoal: (id, input) => request<Goal>('PUT', goal(id), input),
    archiveGoal: (id) => request<Goal>('POST', `${goal(id)}/archive`),
    restoreGoal: (id) => request<Goal>('POST', `${goal(id)}/restore`),
    getGoalProgress: () => request<GoalProgress[]>('GET', '/api/goals/progress'),
    listProjects: (includeArchived = false) =>
      request<Project[]>('GET', `/api/projects?includeArchived=${includeArchived}`),
    createProject: (input) => request<Project>('POST', '/api/projects', input),
    updateProject: (id, input) => request<Project>('PUT', project(id), input),
    archiveProject: (id) => request<Project>('POST', `${project(id)}/archive`),
    restoreProject: (id) => request<Project>('POST', `${project(id)}/restore`),
    createSession: (input) => request<Session>('POST', '/api/sessions', input),
    listTags: () => request<string[]>('GET', '/api/sessions/tags'),
    getSettings: () => request<AppSettings>('GET', '/api/settings'),
    savePomodoroSettings: (settings) =>
      request<PomodoroSettings>('PUT', '/api/settings/pomodoro', settings),
    getCalendar: (month, timeZone) =>
      request<CalendarMonth>(
        'GET',
        `/api/calendar?month=${encodeURIComponent(month)}&timeZone=${encodeURIComponent(timeZone)}`,
      ),
    getDay: (date, timeZone) =>
      request<DayDetail>(
        'GET',
        `/api/days/${encodeURIComponent(date)}?timeZone=${encodeURIComponent(timeZone)}`,
      ),
    saveDayLog: (date, text) =>
      request<{ text: string }>('PUT', `/api/days/${encodeURIComponent(date)}/log`, { text }),
    listNotes: () => request<NoteNode[]>('GET', '/api/notes'),
    createNote: (parentId, kind, title) =>
      request<NoteNode>('POST', '/api/notes', { parentId, kind, title }),
    renameNote: (id, title) => request<NoteNode>('PUT', note(id), { title }),
    moveNote: (id, parentId) => request<NoteNode>('POST', `${note(id)}/move`, { parentId }),
    shiftNote: (id, offset) => request<NoteNode>('POST', `${note(id)}/shift`, { offset }),
    deleteNote: (id) => request<void>('DELETE', note(id)),
  };
}

/** The `errors` of a 400 validation problem, keeping only string messages; undefined for anything else. */
async function readFieldErrors(response: Response): Promise<Record<string, string[]> | undefined> {
  if (response.status !== 400) {
    return undefined;
  }
  try {
    const body: unknown = await response.json();
    const errors = (body as { errors?: unknown }).errors;
    if (typeof errors !== 'object' || errors === null) {
      return undefined;
    }
    return Object.fromEntries(
      Object.entries(errors).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages.filter((m): m is string => typeof m === 'string') : [],
      ]),
    );
  } catch {
    return undefined;
  }
}
