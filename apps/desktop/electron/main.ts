import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { ApiConfig, ChangeDataDirResult } from '../src/shared/api/types';
import { startApi, type ApiHandle } from './apiProcess';
import { readAppConfig, resolveDataDir, writeAppConfig } from './appConfig';
import { FatalSwitchError, switchDataDir, type ApiState, type SwitchSteps } from './dataDirSwitch';
import { isAllowedNavigation } from './navigation';

const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
const rendererFile = join(__dirname, '../renderer/index.html');
const appUrl = devServerUrl ?? pathToFileURL(rendererFile).href;
// file:// pages send `Origin: null`.
const appOrigin = devServerUrl ? new URL(devServerUrl).origin : 'null';
// Phase 0.6 adds the packaged path (resources/api/DevPath.Api.exe).
const apiExePath = resolve(
  app.getAppPath(),
  '../api/DevPath.Api/bin/Debug/net10.0/DevPath.Api.exe',
);
const appConfigFile = join(app.getPath('userData'), 'app-config.json');

let current: ApiState<ApiHandle> | undefined;

function startApiFor(dataDir: string): Promise<ApiHandle> {
  return startApi({
    exePath: apiExePath,
    origin: appOrigin,
    dataDir,
    development: !app.isPackaged,
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
    throw new Error(
      `API bulunamadı: ${apiExePath}\nÖnce "dotnet build apps/api/DevPath.slnx" komutunu çalıştırın.`,
    );
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

/** Every IPC handler answers only the app's own page. */
function handle<T>(channel: string, listener: (event: IpcMainInvokeEvent) => T): void {
  ipcMain.handle(channel, (event) => {
    const senderUrl = event.senderFrame?.url;
    if (!senderUrl || !isAllowedNavigation(senderUrl, appUrl)) {
      throw new Error(`${channel} is only available to the app page.`);
    }
    return listener(event);
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

    mainWindow = createWindow();
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  current?.api.stop();
});
