import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { backupDate, dailyBackup, listBackups, pruneBackups, restoreStamp } from './backups';

let dataDir: string;
const today = new Date(2026, 10, 6, 14, 5, 9);

function write(relative: string, text = '{}'): void {
  const file = join(dataDir, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function backupFolders(): string[] {
  return readdirSync(join(dataDir, 'backups')).sort();
}

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'devpath-backups-'));
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('dailyBackup', () => {
  it('copies the data folder without backups and half-written files', () => {
    write('goals.json');
    write('notes/pages/a.json');
    write('x.json.tmp');
    write('backups/2026-11-01/old.json');

    dailyBackup(dataDir, today);

    const backup = join(dataDir, 'backups', '2026-11-06');
    expect(readdirSync(backup).sort()).toEqual(['goals.json', 'notes']);
    expect(existsSync(join(backup, 'notes', 'pages', 'a.json'))).toBe(true);
  });

  it('runs once a day', () => {
    write('goals.json');
    dailyBackup(dataDir, today);
    write('sessions.json');

    dailyBackup(dataDir, new Date(2026, 10, 6, 23, 0, 0));

    expect(readdirSync(join(dataDir, 'backups', '2026-11-06'))).toEqual(['goals.json']);
  });

  it('makes no backup of an empty data folder', () => {
    dailyBackup(dataDir, today);

    expect(existsSync(join(dataDir, 'backups'))).toBe(false);
  });

  it('replaces a leftover partial backup', () => {
    write('goals.json');
    write('backups/2026-11-06.partial/stale.json');

    dailyBackup(dataDir, today);

    expect(backupFolders()).toEqual(['2026-11-06']);
    expect(readdirSync(join(dataDir, 'backups', '2026-11-06'))).toEqual(['goals.json']);
  });
});

describe('pruneBackups', () => {
  it('keeps every backup of the 14 newest dates', () => {
    for (let day = 1; day <= 16; day++) {
      write(`backups/2026-10-${String(day).padStart(2, '0')}/goals.json`);
    }
    write('backups/2026-10-03-101500/goals.json');
    write('backups/notes.txt', 'mine');
    write('backups/other/file.json');

    pruneBackups(dataDir);

    const left = backupFolders();
    expect(left).not.toContain('2026-10-01');
    expect(left).not.toContain('2026-10-02');
    expect(left).toContain('2026-10-03');
    expect(left).toContain('2026-10-03-101500');
    expect(left).toContain('2026-10-16');
    expect(left).toContain('notes.txt');
    expect(left).toContain('other');
    expect(listBackups(dataDir)).toHaveLength(15);
  });
});

describe('listBackups', () => {
  it('lists backups newest first and ignores anything else', () => {
    write('backups/2026-11-04/a.json');
    write('backups/2026-11-05/a.json');
    write('backups/2026-11-05-093000/a.json');
    write('backups/2026-11-06.partial/a.json');
    write('backups/junk/a.json');
    write('backups/2026-11-07', 'a file');

    expect(listBackups(dataDir)).toEqual([
      { name: '2026-11-05-093000', kind: 'beforeRestore' },
      { name: '2026-11-05', kind: 'daily' },
      { name: '2026-11-04', kind: 'daily' },
    ]);
  });

  it('gives an empty list without a backups folder', () => {
    expect(listBackups(dataDir)).toEqual([]);
  });
});

describe('backup names', () => {
  it('uses zero-padded local time', () => {
    const date = new Date(2026, 0, 5, 9, 7, 3);

    expect(backupDate(date)).toBe('2026-01-05');
    expect(restoreStamp(date)).toBe('2026-01-05-090703');
  });
});
