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

/** One session on the day page; titles are null when the goal or project no longer exists. */
export interface DaySession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  completed: boolean;
  goalId: string;
  goalTitle: string | null;
  projectId: string | null;
  projectTitle: string | null;
  tags: string[];
  note: string | null;
}

/** A goal worked on that day; counts are completed sessions only. */
export interface DayGoal {
  goalId: string;
  title: string | null;
  completedSessions: number;
  totalMinutes: number;
}

/** A page created (`created: true`) or edited on the day. */
export interface DayNote {
  id: string;
  title: string;
  created: boolean;
}

/** GET /api/days/{date}: sessions oldest first, goals most worked first, notes by edit time, and the daily log text. */
export interface DayDetail {
  date: string;
  timeZone: string;
  completedSessions: number;
  totalMinutes: number;
  sessions: DaySession[];
  goals: DayGoal[];
  notes: DayNote[];
  log: string;
}

/** A content type of the shared import format; each module imports one. */
export type ContentType = 'vocab' | 'lesson' | 'interview';

/** One import problem: JSON pointer of the value, its 1-based line (null when unknown) and a Turkish message. */
export interface ImportError {
  path: string;
  line: number | null;
  message: string;
}

/** What a saved import did. `levelKept` is true when the topic existed and the file's level was ignored. */
export interface ImportReport {
  type: ContentType;
  topic: string;
  slug: string;
  created: boolean;
  added: number;
  skipped: number;
  levelKept: boolean;
}

/** POST /api/import/validate. */
export interface ImportValidation {
  errors: ImportError[];
}

/** POST /api/import: errors (nothing saved) or a report. */
export interface ImportResult {
  errors: ImportError[];
  report: ImportReport | null;
}

/** GET /api/content/{type}: a topic in a module's list; `marks` counts the items per mark. */
export interface TopicSummary {
  slug: string;
  topic: string;
  level: string;
  tags: string[];
  itemCount: number;
  marks: Record<string, number>;
  updatedAt: string;
}

/** What every stored item has besides its imported fields: an id, when it was added and the user's mark. */
export interface ContentItemBase {
  id: string;
  addedAt: string;
  mark?: string;
  markedAt?: string;
}

/** GET /api/content/{type}/{slug}: the topic file as stored. */
export interface ContentTopic<TItem extends ContentItemBase> {
  type: ContentType;
  topic: string;
  slug: string;
  level: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  items: TItem[];
}

export type VocabMark = 'known' | 'repeat';

/** An English card: `meaning` is Turkish, `definition` English. */
export interface VocabItem extends ContentItemBase {
  term: string;
  meaning: string;
  example: string;
  definition?: string;
  mark?: VocabMark;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

/** An interview question; `code` is a C# sample, `tags` are the question's own tags. */
export interface InterviewItem extends ContentItemBase {
  question: string;
  answer: string;
  difficulty: Difficulty;
  code?: string;
  tags?: string[];
  mark?: 'practised';
}

export type NoteKind = 'folder' | 'page';

/** A marked part of a search snippet (positions in `snippet`). */
export interface Highlight {
  start: number;
  length: number;
}

/** GET /api/notes/search: a page with its ancestors' titles (top first) and a text piece. */
export interface NoteSearchResult {
  id: string;
  title: string;
  path: string[];
  snippet: string;
  highlights: Highlight[];
}

/** A folder or page of the notes tree (mirrors NoteNode). Siblings are sorted by `order`; any node can have children. */
export interface NoteNode {
  id: string;
  parentId: string | null;
  kind: NoteKind;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
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
  /** Runs `callback` (and waits for it, at most 3 s) before the window closes. Returns an unsubscribe function. */
  onBeforeClose(callback: () => Promise<void>): () => void;
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
