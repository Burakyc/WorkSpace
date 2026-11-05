import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { ApiConfig } from '../src/shared/api/types';
import { startApi, type ApiHandle } from './apiProcess';
import { readAppConfig, resolveDataDir } from './appConfig';
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

let api: ApiHandle | undefined;

function prepareDataDir(): string {
  const config = readAppConfig(join(app.getPath('userData'), 'app-config.json'));
  const dataDir = resolveDataDir(config, app.getPath('appData'), app.isPackaged);
  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (error) {
    throw new Error(`Veri klasörü oluşturulamadı: ${dataDir}`, { cause: error });
  }
  return dataDir;
}

async function launchApi(): Promise<ApiHandle> {
  const dataDir = prepareDataDir();
  if (!existsSync(apiExePath)) {
    throw new Error(
      `API bulunamadı: ${apiExePath}\nÖnce "dotnet build apps/api/DevPath.slnx" komutunu çalıştırın.`,
    );
  }
  return startApi({
    exePath: apiExePath,
    origin: appOrigin,
    dataDir,
    development: !app.isPackaged,
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
      api = await launchApi();
    } catch (error) {
      dialog.showErrorBox(
        'DevPath başlatılamadı',
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
      return;
    }

    const config: ApiConfig = { baseUrl: api.baseUrl, token: api.token };
    ipcMain.handle('devpath:get-api-config', (event): ApiConfig => {
      const senderUrl = event.senderFrame?.url;
      if (!senderUrl || !isAllowedNavigation(senderUrl, appUrl)) {
        throw new Error('getApiConfig is only available to the app page.');
      }
      return config;
    });

    mainWindow = createWindow();
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  api?.stop();
});
