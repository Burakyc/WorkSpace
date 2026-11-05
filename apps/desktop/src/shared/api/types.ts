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

/** What main answers to a data folder change. `dataDir` is null when the user cancelled the dialog. */
export type ChangeDataDirResult = { dataDir: string | null } | { error: string };

/** What the preload script exposes as `window.devpath`. */
export interface DevPathBridge {
  getApiConfig(): Promise<ApiConfig>;
  settings: {
    getDataDir(): Promise<string>;
    /** Opens the folder dialog and switches to the chosen folder. Resolves null on cancel; rejects with a Turkish message. */
    changeDataDir(): Promise<string | null>;
  };
}
