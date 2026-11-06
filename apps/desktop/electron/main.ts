import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
  safeStorage,
  shell,
  type IpcMainInvokeEvent,
} from 'electron';
import type { ApiConfig, ChangeDataDirResult, SecretResult } from '../src/shared/api/types';
import { createCloseGuard } from './closeGuard';
import { apiEnvironment, resolveApiExePath, startApi, type ApiHandle } from './apiProcess';
import { readAppConfig, resolveDataDir, writeAppConfig } from './appConfig';
import { FatalSwitchError, switchDataDir, type ApiState, type SwitchSteps } from './dataDirSwitch';
import { isAllowedExternalUrl, isAllowedNavigation } from './navigation';
import { createSecretStore, isSecretName, isValidSecretValue } from './secrets';
import { createSessionNotifier, isValidSchedule } from './sessionNotifier';

const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
const rendererFile = join(__dirname, '../renderer/index.html');
const appUrl = devServerUrl ?? pathToFileURL(rendererFile).href;
// file:// pages send `Origin: null`.
const appOrigin = devServerUrl ? new URL(devServerUrl).origin : 'null';
const apiExePath = resolveApiExePath({
  packaged: app.isPackaged,
  resourcesPath: process.resourcesPath,
  appPath: app.getAppPath(),
});
const appConfigFile = join(app.getPath('userData'), 'app-config.json');
const secretsFile = join(app.getPath('userData'), 'secrets.bin');
// One id per app launch; every API started in this launch gets it (see VisitService).
const launchId = randomUUID();

// safeStorage works only after 'ready'; the store calls it only when used.
const secrets = createSecretStore({
  read: () => (existsSync(secretsFile) ? readFileSync(secretsFile, 'utf8') : null),
  write: (text) => {
    const temp = `${secretsFile}.tmp`;
    writeFileSync(temp, text);
    renameSync(temp, secretsFile);
  },
  encrypt: (plain) => safeStorage.encryptString(plain),
  decrypt: (encrypted) => safeStorage.decryptString(encrypted),
  available: () => safeStorage.isEncryptionAvailable(),
});

// Windows shows toasts only for an AppUserModelID that has a Start menu shortcut. The installer creates one for
// com.devpath.workspace (electron-builder appId); unpackaged runs keep Electron's default id, which Windows knows.
if (app.isPackaged) {
  app.setAppUserModelId('com.devpath.workspace');
}

let current: ApiState<ApiHandle> | undefined;

function startApiFor(dataDir: string): Promise<ApiHandle> {
  return startApi({
    exePath: apiExePath,
    origin: appOrigin,
    dataDir,
    development: !app.isPackaged,
    env: apiEnvironment(secrets.get('githubToken'), launchId),
  });
}

async function launch(): Promise<ApiState<ApiHandle>> {
  const dataDir = resolveDataDir(
    readAppConfig(appConfigFile),
    app.getPath('appData'),
    app.isPackaged,
  );
  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (error) {
    throw new Error(`Veri klasörü oluşturulamadı: ${dataDir}`, { cause: error });
  }
  if (!existsSync(apiExePath)) {
    const hint = app.isPackaged
      ? 'Uygulamayı yeniden kurun.'
      : 'Önce "dotnet build apps/api/DevPath.slnx" komutunu çalıştırın.';
    throw new Error(`API bulunamadı: ${apiExePath}\n${hint}`);
  }
  return { dataDir, api: await startApiFor(dataDir) };
}

const switchSteps: SwitchSteps<ApiHandle> = {
  createFolder: (dataDir) => mkdirSync(dataDir, { recursive: true }),
  readConfigFile: () => (existsSync(appConfigFile) ? readFileSync(appConfigFile, 'utf8') : null),
  restoreConfigFile: (text) =>
    text === null ? rmSync(appConfigFile, { force: true }) : writeFileSync(appConfigFile, text),
  writeConfig: (dataDir) => writeAppConfig(appConfigFile, { dataDir }),
  stopApi: (api) => api.stop(),
  startApi: startApiFor,
};

function fail(error: unknown): void {
  dialog.showErrorBox(
    'DevPath başlatılamadı',
    error instanceof Error ? error.message : String(error),
  );
  app.quit();
}

/** Every IPC handler answers only the app's own page. Arguments arrive untyped and are checked by the listener. */
function handle<T>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => T,
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    const senderUrl = event.senderFrame?.url;
    if (!senderUrl || !isAllowedNavigation(senderUrl, appUrl)) {
      throw new Error(`${channel} is only available to the app page.`);
    }
    return listener(event, ...args);
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, appUrl)) {
      event.preventDefault();
    }
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(rendererFile);
  }

  return window;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | undefined;

  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  void app.whenReady().then(async () => {
    try {
      current = await launch();
    } catch (error) {
      fail(error);
      return;
    }

    handle('devpath:get-api-config', (): ApiConfig => {
      const { api } = current!;
      return { baseUrl: api.baseUrl, token: api.token };
    });

    handle('devpath:get-data-dir', () => current!.dataDir);

    // Kept so the notification is not garbage collected before it is clicked.
    let lastNotification: Notification | undefined;
    const notifier = createSessionNotifier({
      now: () => Date.now(),
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      notify: (title, body) => {
        lastNotification = new Notification({ title, body, silent: true });
        lastNotification.on('click', () => {
          if (!mainWindow) return;
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('devpath:open-page', '/pomodoro');
        });
        lastNotification.show();
      },
    });

    handle('devpath:pomodoro-schedule-end', (_event, endsAt, title, body) => {
      if (!isValidSchedule(endsAt, title, body, Date.now())) {
        throw new Error('Invalid session end.');
      }
      notifier.schedule(endsAt as number, title as string, body as string);
    });

    handle('devpath:pomodoro-cancel-end', () => notifier.cancel());

    handle('devpath:open-external', async (_event, url) => {
      if (typeof url !== 'string' || !isAllowedExternalUrl(url)) {
        throw new Error('Only https links can be opened.');
      }
      await shell.openExternal(url);
    });

    handle('devpath:change-data-dir', async (): Promise<ChangeDataDirResult> => {
      const window = mainWindow!;
      const choice = await dialog.showOpenDialog(window, {
        title: 'Veri klasörü seç',
        defaultPath: current!.dataDir,
        properties: ['openDirectory', 'createDirectory'],
      });
      const picked = choice.filePaths[0];
      if (choice.canceled || picked === undefined) {
        return { dataDir: null };
      }

      const before = current!;
      try {
        const result = await switchDataDir(before, picked, switchSteps);
        current = result.state;
        if (result.error) {
          return { error: result.error };
        }
      } catch (error) {
        current = undefined;
        if (error instanceof FatalSwitchError) {
          fail(error);
        }
        throw error;
      }

      if (current.dataDir !== before.dataDir) {
        // The new API has a new port and token: reload so nothing in the page keeps the old ones.
        setTimeout(() => window.webContents.reload(), 0);
      }
      return { dataDir: current.dataDir };
    });

    handle('devpath:secrets-has', (_event, name) => {
      if (!isSecretName(name)) throw new Error('Unknown secret.');
      return secrets.has(name);
    });

    /** Applies a secret change, then restarts the API with the new environment and reloads the page. */
    async function changeSecret(apply: () => void): Promise<SecretResult> {
      try {
        apply();
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
      const { dataDir, api } = current!;
      api.stop();
      try {
        current = { dataDir, api: await startApiFor(dataDir) };
      } catch (error) {
        current = undefined;
        fail(error);
        throw error;
      }
      setTimeout(() => mainWindow?.webContents.reload(), 0);
      return { ok: true };
    }

    handle('devpath:secrets-set', (_event, name, value) => {
      if (!isSecretName(name)) throw new Error('Unknown secret.');
      if (!isValidSecretValue(value)) return { error: 'Token geçersiz.' };
      return changeSecret(() => secrets.set(name, value));
    });

    handle('devpath:secrets-clear', (_event, name) => {
      if (!isSecretName(name)) throw new Error('Unknown secret.');
      return changeSecret(() => secrets.clear(name));
    });

    mainWindow = createWindow();
    const window = mainWindow;
    const closeGuard = createCloseGuard({
      requestFlush: () => window.webContents.send('devpath:before-close'),
      close: () => window.close(),
    });
    window.on('close', (event) => closeGuard.onClose(event));
    handle('devpath:close-ready', () => closeGuard.ready());
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  current?.api.stop();
});
