import { resolve } from 'node:path';

/** The running API and the data folder it uses. */
export interface ApiState<Api> {
  dataDir: string;
  api: Api;
}

/** The side effects of a switch, injected so the order and the rollback can be tested without Electron. */
export interface SwitchSteps<Api> {
  createFolder(dataDir: string): void;
  /** The current app-config.json text, or null when there is none. */
  readConfigFile(): string | null;
  /** Puts back what readConfigFile returned (null deletes the file). */
  restoreConfigFile(text: string | null): void;
  writeConfig(dataDir: string): void;
  stopApi(api: Api): void;
  startApi(dataDir: string): Promise<Api>;
}

export interface SwitchResult<Api> {
  /** What is running now: the new folder on success, the old one after a failure. */
  state: ApiState<Api>;
  /** A Turkish message for the Settings page when the switch did not happen. */
  error?: string;
}

/** Neither the new nor the old folder has a running API: the app cannot continue. */
export class FatalSwitchError extends Error {
  override name = 'FatalSwitchError';
}

export async function switchDataDir<Api>(
  current: ApiState<Api>,
  next: string,
  steps: SwitchSteps<Api>,
): Promise<SwitchResult<Api>> {
  if (resolve(next).toLowerCase() === resolve(current.dataDir).toLowerCase()) {
    return { state: current };
  }

  try {
    steps.createFolder(next);
  } catch {
    return { state: current, error: `Veri klasörü oluşturulamadı: ${next}` };
  }

  const previousConfig = steps.readConfigFile();
  steps.writeConfig(next);
  steps.stopApi(current.api);

  try {
    return { state: { dataDir: next, api: await steps.startApi(next) } };
  } catch {
    steps.restoreConfigFile(previousConfig);
  }

  try {
    const api = await steps.startApi(current.dataDir);
    return {
      state: { dataDir: current.dataDir, api },
      error: 'API yeni klasörle başlatılamadı; eski klasöre dönüldü.',
    };
  } catch (error) {
    throw new FatalSwitchError(
      `API ne yeni (${next}) ne de eski (${current.dataDir}) klasörle başlatılabildi.`,
      { cause: error },
    );
  }
}
