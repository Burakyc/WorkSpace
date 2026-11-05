import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readAppConfig, resolveDataDir, writeAppConfig } from './appConfig';

let folder: string;
let file: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'devpath-config-'));
  file = join(folder, 'app-config.json');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('readAppConfig', () => {
  it('treats a missing file as an empty config', () => {
    expect(readAppConfig(file)).toEqual({});
  });

  it('reads dataDir and ignores other keys', () => {
    writeFileSync(file, JSON.stringify({ dataDir: 'D:\\DevPathData', other: 1 }));

    expect(readAppConfig(file)).toEqual({ dataDir: 'D:\\DevPathData' });
  });

  it('accepts a file that starts with a byte order mark', () => {
    writeFileSync(file, '\uFEFF{ "dataDir": "\\\\\\\\nas\\\\devpath" }');

    expect(readAppConfig(file)).toEqual({ dataDir: '\\\\nas\\devpath' });
  });

  it('rejects invalid JSON and names the file', () => {
    writeFileSync(file, '{ not json');

    expect(() => readAppConfig(file)).toThrow(file);
  });

  it.each(['[]', '"x"', 'null', '1'])('rejects %s because it is not an object', (content) => {
    writeFileSync(file, content);

    expect(() => readAppConfig(file)).toThrow(file);
  });

  it.each([
    ['a relative path', 'relative\\folder'],
    ['a rooted path without a drive', '\\data'],
    ['an empty string', ''],
    ['a number', 1],
  ])('rejects %s as dataDir and names the file', (_name, dataDir) => {
    writeFileSync(file, JSON.stringify({ dataDir }));

    expect(() => readAppConfig(file)).toThrow(file);
  });
});

describe('resolveDataDir', () => {
  const appData = 'C:\\Users\\me\\AppData\\Roaming';

  it('uses the configured folder', () => {
    expect(resolveDataDir({ dataDir: 'D:\\Data' }, appData, true)).toBe('D:\\Data');
    expect(resolveDataDir({ dataDir: 'D:\\Data' }, appData, false)).toBe('D:\\Data');
  });

  it('defaults to DevPath\\data when packaged and DevPath\\dev-data when not', () => {
    expect(resolveDataDir({}, appData, true)).toBe(join(appData, 'DevPath', 'data'));
    expect(resolveDataDir({}, appData, false)).toBe(join(appData, 'DevPath', 'dev-data'));
  });
});

describe('writeAppConfig', () => {
  const readJson = (): unknown => JSON.parse(readFileSync(file, 'utf8'));

  it('creates the file with schemaVersion 1', () => {
    writeAppConfig(file, { dataDir: 'D:\\Data' });

    expect(readJson()).toEqual({ schemaVersion: 1, dataDir: 'D:\\Data' });
  });

  it('keeps other keys', () => {
    writeFileSync(file, JSON.stringify({ other: 1, dataDir: 'C:\\Old' }));

    writeAppConfig(file, { dataDir: 'D:\\Data' });

    expect(readJson()).toEqual({ schemaVersion: 1, other: 1, dataDir: 'D:\\Data' });
  });

  it('leaves no temp file and reads back', () => {
    writeAppConfig(file, { dataDir: 'D:\\Data' });

    expect(existsSync(`${file}.tmp`)).toBe(false);
    expect(readAppConfig(file)).toEqual({ dataDir: 'D:\\Data' });
  });

  it.each(['2', '"1"'])('refuses to read schemaVersion %s', (version) => {
    writeFileSync(file, `{ "schemaVersion": ${version} }`);

    expect(() => readAppConfig(file)).toThrow(file);
  });
});
