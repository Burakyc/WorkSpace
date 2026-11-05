import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Non-secret settings in `userData/app-config.json`. Only Electron main reads it; the settings page (phase 0.5) writes it. */
export interface AppConfig {
  dataDir?: string;
}

// Drive path (C:\…) or UNC path (\\server\…), the same rule as the API's Path.IsPathFullyQualified.
const fullyQualifiedPath = /^(?:[a-zA-Z]:[\\/]|\\\\[^\\])/;

/** Reads the config. A missing file is an empty config; anything invalid throws a Turkish message naming the file. */
export function readAppConfig(file: string): AppConfig {
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

  const { dataDir } = parsed as Record<string, unknown>;
  if (dataDir === undefined) {
    return {};
  }
  if (typeof dataDir !== 'string' || !fullyQualifiedPath.test(dataDir)) {
    throw new Error(`${file}: "dataDir" tam bir klasör yolu olmalı (örneğin D:\\DevPathData).`);
  }
  return { dataDir };
}

/** The configured folder, else `<appData>\DevPath\data` for the installed app and `<appData>\DevPath\dev-data` for development. */
export function resolveDataDir(config: AppConfig, appDataDir: string, packaged: boolean): string {
  return config.dataDir ?? join(appDataDir, 'DevPath', packaged ? 'data' : 'dev-data');
}
