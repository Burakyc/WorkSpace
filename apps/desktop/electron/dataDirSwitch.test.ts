import { describe, expect, it } from 'vitest';
import { FatalSwitchError, switchDataDir, type SwitchSteps } from './dataDirSwitch';

const OLD = 'C:\\Old';
const NEW = 'D:\\New';

interface FakeApi {
  dataDir: string;
}

function fakeSteps(options: { failFolder?: boolean; failStartFor?: string[] } = {}) {
  const calls: string[] = [];
  let configFile: string | null = '{"dataDir":"C:\\\\Old"}';
  const steps: SwitchSteps<FakeApi> = {
    createFolder: (dir) => {
      calls.push(`createFolder ${dir}`);
      if (options.failFolder) throw new Error('EPERM');
    },
    readConfigFile: () => configFile,
    restoreConfigFile: (text) => {
      calls.push('restoreConfig');
      configFile = text;
    },
    writeConfig: (dir) => {
      calls.push(`writeConfig ${dir}`);
      configFile = JSON.stringify({ dataDir: dir });
    },
    stopApi: (api) => calls.push(`stopApi ${api.dataDir}`),
    startApi: (dir) => {
      calls.push(`startApi ${dir}`);
      return options.failStartFor?.includes(dir)
        ? Promise.reject(new Error('timeout'))
        : Promise.resolve({ dataDir: dir });
    },
  };
  return { steps, calls, config: () => configFile };
}

const current = { dataDir: OLD, api: { dataDir: OLD } };

describe('switchDataDir', () => {
  it('does nothing for the same folder', async () => {
    const { steps, calls } = fakeSteps();

    const result = await switchDataDir(current, 'c:\\old\\', steps);

    expect(result).toEqual({ state: current });
    expect(calls).toEqual([]);
  });

  it('creates the folder, writes the config, stops the old API and starts the new one', async () => {
    const { steps, calls, config } = fakeSteps();

    const result = await switchDataDir(current, NEW, steps);

    expect(calls).toEqual([
      `createFolder ${NEW}`,
      `writeConfig ${NEW}`,
      `stopApi ${OLD}`,
      `startApi ${NEW}`,
    ]);
    expect(result).toEqual({ state: { dataDir: NEW, api: { dataDir: NEW } } });
    expect(config()).toBe(JSON.stringify({ dataDir: NEW }));
  });

  it('changes nothing when the folder cannot be created', async () => {
    const { steps, calls } = fakeSteps({ failFolder: true });

    const result = await switchDataDir(current, NEW, steps);

    expect(result).toEqual({ state: current, error: `Veri klasörü oluşturulamadı: ${NEW}` });
    expect(calls).toEqual([`createFolder ${NEW}`]);
  });

  it('goes back to the old folder when the new API does not start', async () => {
    const { steps, calls, config } = fakeSteps({ failStartFor: [NEW] });

    const result = await switchDataDir(current, NEW, steps);

    expect(calls.slice(-3)).toEqual([`startApi ${NEW}`, 'restoreConfig', `startApi ${OLD}`]);
    expect(config()).toBe('{"dataDir":"C:\\\\Old"}');
    expect(result.state).toEqual({ dataDir: OLD, api: { dataDir: OLD } });
    expect(result.error).toMatch(/eski klasöre dönüldü/);
  });

  it('is fatal when the old API does not start again either', async () => {
    const { steps } = fakeSteps({ failStartFor: [NEW, OLD] });

    await expect(switchDataDir(current, NEW, steps)).rejects.toBeInstanceOf(FatalSwitchError);
  });
});
