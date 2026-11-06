import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { BackupInfo } from '../src/shared/api/types';

const BACKUPS = 'backups';
const KEEP_DATES = 14;
const backupName = /^\d{4}-\d{2}-\d{2}(-\d{6})?$/;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local date, `YYYY-MM-DD`: the name of the daily backup. */
export function backupDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local time, `YYYY-MM-DD-HHmmss`: the name of the backup made before a restore. */
export function restoreStamp(now: Date): string {
  return `${backupDate(now)}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const backupsDir = (dataDir: string): string => join(dataDir, BACKUPS);

/** Backups of the data folder, newest first. Anything in `backups/` that is not a backup folder is ignored. */
export function listBackups(dataDir: string): BackupInfo[] {
  const dir = backupsDir(dataDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && backupName.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .map((name) => ({ name, kind: name.length > 10 ? 'beforeRestore' : 'daily' }));
}

/** Keeps every backup of the 14 newest dates that have one and deletes the rest. */
export function pruneBackups(dataDir: string): void {
  const backups = listBackups(dataDir);
  const keptDates = new Set(
    [...new Set(backups.map((backup) => backup.name.slice(0, 10)))].slice(0, KEEP_DATES),
  );
  for (const { name } of backups) {
    if (!keptDates.has(name.slice(0, 10))) {
      rmSync(join(backupsDir(dataDir), name), { recursive: true, force: true });
    }
  }
}

/** Copies today's backup unless it exists or the data folder is empty, then prunes. */
export function dailyBackup(dataDir: string, now: Date): void {
  const name = backupDate(now);
  if (existsSync(join(backupsDir(dataDir), name)) || dataEntries(dataDir).length === 0) return;
  snapshot(dataDir, name);
  pruneBackups(dataDir);
}

/**
 * Replaces the data folder's contents with a listed backup, after backing up the current data. Returns the name of
 * that pre-restore backup. A failed copy puts the pre-restore data back. The API must not be running.
 */
export function restoreBackup(
  dataDir: string,
  name: string,
  now: Date,
  copy: (from: string, to: string) => void = copyData,
): string {
  if (!listBackups(dataDir).some((backup) => backup.name === name)) {
    throw new Error('Yedek bulunamadı.');
  }
  const before = restoreStamp(now);
  snapshot(dataDir, before);
  try {
    replaceData(dataDir, join(backupsDir(dataDir), name), copy);
  } catch (error) {
    replaceData(dataDir, join(backupsDir(dataDir), before), copyData);
    throw new Error('Yedek geri yüklenemedi.', { cause: error });
  }
  pruneBackups(dataDir);
  return before;
}

function replaceData(
  dataDir: string,
  from: string,
  copy: (from: string, to: string) => void,
): void {
  for (const entry of dataEntries(dataDir)) {
    rmSync(join(dataDir, entry), { recursive: true, force: true });
  }
  copy(from, dataDir);
}

/** Top-level entries of a folder without `backups/`. */
function dataEntries(dir: string): string[] {
  return readdirSync(dir).filter((name) => name.toLowerCase() !== BACKUPS);
}

/** Copies a folder's entries (without `backups/` and `*.tmp` half-writes) into `to`. */
function copyData(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const entry of dataEntries(from)) {
    cpSync(join(from, entry), join(to, entry), {
      recursive: true,
      filter: (source) => !source.endsWith('.tmp'),
    });
  }
}

/** Copies the data folder to `backups/<name>` through a `.partial` folder, so a crash never leaves a half backup. */
function snapshot(dataDir: string, name: string): void {
  const target = join(backupsDir(dataDir), name);
  const partial = `${target}.partial`;
  rmSync(partial, { recursive: true, force: true });
  copyData(dataDir, partial);
  renameSync(partial, target);
}
