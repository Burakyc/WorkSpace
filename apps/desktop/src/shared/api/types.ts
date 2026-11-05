/** Where and how the renderer reaches the local API. Comes from Electron main through the preload bridge. */
export interface ApiConfig {
  baseUrl: string;
  token: string;
}

/** GET /api/health (mirrors HealthResponse in DevPath.Api). */
export interface HealthResponse {
  status: string;
  version: string;
}

/** A goal (mirrors Goal in DevPath.Api). `createdAt` is ISO 8601 UTC. */
export interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetPomodoros: number | null;
  archived: boolean;
  createdAt: string;
}

/** What the user can set on a goal (mirrors GoalInput). */
export interface GoalInput {
  title: string;
  description: string | null;
  targetPomodoros: number | null;
}

/** A project under one goal (mirrors Project in DevPath.Api). Its goal never changes. */
export interface Project {
  id: string;
  goalId: string;
  title: string;
  url: string | null;
  archived: boolean;
  createdAt: string;
}

export interface ProjectCreateInput {
  goalId: string;
  title: string;
  url: string | null;
}

export interface ProjectUpdateInput {
  title: string;
  url: string | null;
}

/** A logged focus session (mirrors Session in DevPath.Api). Times are ISO 8601 UTC. */
export interface Session {
  id: string;
  goalId: string;
  projectId: string | null;
  tags: string[];
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  completed: boolean;
  note: string | null;
}

/** POST /api/sessions. */
export interface SessionInput {
  goalId: string;
  projectId: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  completed: boolean;
  note: string | null;
  /** Normalized by the API (lower case, no '#'). */
  tags: string[];
}

/** Timer lengths in minutes and the number of completed focus sessions before a long break. */
export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

/** GET /api/settings. */
export interface AppSettings {
  pomodoro: PomodoroSettings;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

/** GET /api/goals/progress. `percent` is null when the goal has no target. */
export interface GoalProgress {
  goalId: string;
  completedSessions: number;
  totalMinutes: number;
  percent: number | null;
}

/** One day of GET /api/calendar: completed sessions started on that local date. */
export interface CalendarDay {
  date: string;
  completedSessions: number;
  totalMinutes: number;
}

/** GET /api/calendar: every day of the month's visible grid, Monday first. */
export interface CalendarMonth {
  month: string;
  timeZone: string;
  days: CalendarDay[];
}

/** What main answers to a data folder change. `dataDir` is null when the user cancelled the dialog. */
export type ChangeDataDirResult = { dataDir: string | null } | { error: string };

/** What the preload script exposes as `window.devpath`. */
export interface DevPathBridge {
  getApiConfig(): Promise<ApiConfig>;
  /** Opens an https link in the default browser; main refuses anything else. */
  openExternal(url: string): Promise<void>;
  /** Main asks the page to open a route (e.g. after a notification click). Returns an unsubscribe function. */
  onOpenPage(callback: (path: string) => void): () => void;
  pomodoro: {
    /** Schedules the end-of-timer notification; replaces any earlier one. */
    scheduleEnd(endsAt: number, title: string, body: string): Promise<void>;
    cancelEnd(): Promise<void>;
  };
  settings: {
    getDataDir(): Promise<string>;
    /** Opens the folder dialog and switches to the chosen folder. Resolves null on cancel; rejects with a Turkish message. */
    changeDataDir(): Promise<string | null>;
  };
}
