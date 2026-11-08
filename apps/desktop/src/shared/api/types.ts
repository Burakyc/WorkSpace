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

/** An API error for the developer panel: never a message. `path` is `METHOD route-template`. */
export interface ApiErrorEntry {
  at: string;
  source: string;
  kind: string;
  path: string | null;
}

/** A top-level data file, or a top-level folder with its file count and total size. */
export interface DataFileSize {
  name: string;
  folder: boolean;
  files: number;
  bytes: number;
}

/** GET /api/dev. */
export interface DevStatus {
  errors: ApiErrorEntry[];
  files: DataFileSize[];
  totalBytes: number;
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

/** A daily reminder: local time (`HH:MM`, 24-hour) and whether it notifies. */
export interface Reminder {
  time: string;
  enabled: boolean;
}

/** The daily English and tech reminders; `PUT /api/settings/reminders`. */
export interface ReminderSettings {
  english: Reminder;
  tech: Reminder;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  english: { time: '09:00', enabled: true },
  tech: { time: '20:00', enabled: true },
};

/** How a module gets AI content. */
export type AiMode = 'copyPaste' | 'file' | 'api';

/** The modules with an AI mode setting; a later module adds its name (also in the API's `AiModes`). */
export type AiModule = 'english' | 'learning' | 'interview';

export type AiModes = Record<AiModule, AiMode>;

/** GET /api/settings. */
export interface AppSettings {
  pomodoro: PomodoroSettings;
  reminders: ReminderSettings;
  aiModes: AiModes;
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

/** One part of a lesson; `body` is plain text with blank lines between paragraphs and ``` code fences. */
export interface LessonItem extends ContentItemBase {
  title: string;
  summary: string;
  body: string;
  exercises?: string[];
  mark?: 'done';
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

/** One X summary from feed.json (mirrors FeedItem). */
export interface FeedItem {
  title: string;
  summary: string;
  url: string | null;
  source: string | null;
  publishedAt: string | null;
}

/** GET /api/home/feed. `errors` are Turkish lines with a JSON path; an invalid file has no items. */
export interface FeedResponse {
  status: 'ok' | 'missing' | 'invalid';
  generatedAt: string | null;
  items: FeedItem[];
  errors: string[];
}

/** A followed YouTube channel (mirrors YouTubeChannel). */
export interface YouTubeChannel {
  id: string;
  title: string;
}

/** A cached video; `thumbnailUrl` and `url` are built by the API from the video id. */
export interface YouTubeVideo {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
}

/** GET /api/youtube/videos, POST /api/youtube/refresh: the 10 newest videos and how the last refresh went. */
export interface YouTubeVideos {
  videos: YouTubeVideo[];
  lastRefreshAt: string | null;
  error: string | null;
}

/** What main answers to a data folder change. `dataDir` is null when the user cancelled the dialog. */
export type ChangeDataDirResult = { dataDir: string | null } | { error: string };

/** GET/PUT /api/github/settings. */
export interface GitHubSettings {
  username: string | null;
}

/** One recent public commit; `url` is a github.com link or null. */
export interface GitHubCommit {
  repo: string;
  sha: string;
  message: string;
  date: string;
  url: string | null;
}

export interface GitHubStats {
  stars: number;
  followers: number;
  publicRepos: number;
  commitsLast30Days: number;
  recentCommits: GitHubCommit[];
}

/** GET /api/github/stats, POST /api/github/refresh, PUT /api/github/settings: cached stats and the last refresh. */
export interface GitHubStatus {
  username: string | null;
  stats: GitHubStats | null;
  fetchedAt: string | null;
  lastRefreshAt: string | null;
  error: string | null;
}

/** POST /api/home/visit: what changed since the previous app session; null when a side has no number. */
export interface VisitChanges {
  since: string | null;
  newStars: number | null;
  newFollowers: number | null;
  newVideos: number | null;
  streakDays: number;
}

/** The secrets the page may set (never read): stored encrypted by main with safeStorage. */
export type SecretName = 'githubToken';

/** What main answers to a secret change; the error is a Turkish message. */
export type SecretResult = { ok: true } | { error: string };

/** A folder in `<dataDir>/backups`: `YYYY-MM-DD` (daily) or `YYYY-MM-DD-HHmmss` (made before a restore). */
export interface BackupInfo {
  name: string;
  kind: 'daily' | 'beforeRestore';
}

/** `error` only when the backup is unknown; a failed copy is shown by main before the window reloads. */
export type RestoreBackupResult = { error?: string };

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
  reminders: {
    /** Main reads the reminder times again from the API (after a save in Ayarlar). */
    refresh(): Promise<void>;
  };
  /** Saving or deleting restarts the API with the new value and reloads the window. A secret is never readable here. */
  secrets: {
    has(name: SecretName): Promise<boolean>;
    /** Rejects with a Turkish message (e.g. no OS encryption). */
    set(name: SecretName, value: string): Promise<void>;
    clear(name: SecretName): Promise<void>;
  };
  settings: {
    getDataDir(): Promise<string>;
    /** Opens the folder dialog and switches to the chosen folder. Resolves null on cancel; rejects with a Turkish message. */
    changeDataDir(): Promise<string | null>;
    /** Backups of the current data folder, newest first. */
    listBackups(): Promise<BackupInfo[]>;
    /** Restores a backup (the current data is backed up first); main then reloads the window. Rejects with a Turkish message. */
    restoreBackup(name: string): Promise<void>;
  };
}
