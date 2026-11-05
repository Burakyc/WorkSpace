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

/** GET /api/goals/progress. `percent` is null when the goal has no target. */
export interface GoalProgress {
  goalId: string;
  completedSessions: number;
  totalMinutes: number;
  percent: number | null;
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
    /** Schedules the "focus session ended" notification; replaces any earlier one. */
    scheduleEnd(endsAt: number, body: string): Promise<void>;
    cancelEnd(): Promise<void>;
  };
  settings: {
    getDataDir(): Promise<string>;
    /** Opens the folder dialog and switches to the chosen folder. Resolves null on cancel; rejects with a Turkish message. */
    changeDataDir(): Promise<string | null>;
  };
}
