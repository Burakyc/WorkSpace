import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Non-secret settings in `userData/app-config.json`, read and written only by Electron main. */
export interface AppConfig {
  dataDir?: string;
}

export const APP_CONFIG_SCHEMA_VERSION = 1;

// Drive path (C:\…) or UNC path (\\server\…), the same rule as the API's Path.IsPathFullyQualified.
const fullyQualifiedPath = /^(?:[a-zA-Z]:[\\/]|\\\\[^\\])/;

/** Reads the config. A missing file is an empty config; anything invalid throws a Turkish message naming the file. */
export function readAppConfig(file: string): AppConfig {
  const raw = readRawConfig(file);

  const { schemaVersion, dataDir } = raw;
  if (
    schemaVersion !== undefined &&
    (typeof schemaVersion !== 'number' || schemaVersion > APP_CONFIG_SCHEMA_VERSION)
  ) {
    throw new Error(
      `${file} bu uygulamanın tanımadığı bir sürümde (schemaVersion ${JSON.stringify(schemaVersion)}).`,
    );
  }

  if (dataDir === undefined) {
    return {};
  }
  if (typeof dataDir !== 'string' || !fullyQualifiedPath.test(dataDir)) {
    throw new Error(`${file}: "dataDir" tam bir klasör yolu olmalı (örneğin D:\\DevPathData).`);
  }
  return { dataDir };
}

/** Sets `dataDir`, keeps every other key, stamps `schemaVersion` and replaces the file atomically. */
export function writeAppConfig(file: string, config: Required<AppConfig>): void {
  const rest = { ...readRawConfig(file) };
  delete rest['schemaVersion'];
  const next = { schemaVersion: APP_CONFIG_SCHEMA_VERSION, ...rest, dataDir: config.dataDir };

  mkdirSync(dirname(file), { recursive: true });
  const tempFile = `${file}.tmp`;
  writeFileSync(tempFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(tempFile, file);
}

/** The configured folder, else `<appData>\DevPath\data` for the installed app and `<appData>\DevPath\dev-data` for development. */
export function resolveDataDir(config: AppConfig, appDataDir: string, packaged: boolean): string {
  return config.dataDir ?? join(appDataDir, 'DevPath', packaged ? 'data' : 'dev-data');
}

function readRawConfig(file: string): Record<string, unknown> {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new Error(`${file} okunamadı.`, { cause: error });
  }

  let parsed: unknown;
  try {
    // Editors such as Notepad may start the file with a byte order mark.
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${file} geçerli bir JSON dosyası değil.`, { cause: error });
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} bir JSON nesnesi ({ ... }) olmalı.`);
  }
  return parsed as Record<string, unknown>;
}
