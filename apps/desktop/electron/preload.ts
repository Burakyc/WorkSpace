import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  ApiConfig,
  BackupInfo,
  ChangeDataDirResult,
  DevPathBridge,
  RestoreBackupResult,
  SecretResult,
} from '../src/shared/api/types';

// Work the page must finish before the window closes (e.g. a pending note save).
const beforeClose = new Set<() => Promise<void>>();
ipcRenderer.on('devpath:before-close', () => {
  void Promise.allSettled([...beforeClose].map((callback) => callback())).then(() =>
    ipcRenderer.invoke('devpath:close-ready'),
  );
});

const bridge: DevPathBridge = {
  getApiConfig: () => ipcRenderer.invoke('devpath:get-api-config') as Promise<ApiConfig>,
  openExternal: async (url) => {
    await ipcRenderer.invoke('devpath:open-external', url);
  },
  onOpenPage: (callback) => {
    const listener = (_event: IpcRendererEvent, path: unknown) => {
      if (typeof path === 'string') callback(path);
    };
    ipcRenderer.on('devpath:open-page', listener);
    return () => {
      ipcRenderer.removeListener('devpath:open-page', listener);
    };
  },
  onBeforeClose: (callback) => {
    beforeClose.add(callback);
    return () => {
      beforeClose.delete(callback);
    };
  },
  pomodoro: {
    scheduleEnd: async (endsAt, title, body) => {
      await ipcRenderer.invoke('devpath:pomodoro-schedule-end', endsAt, title, body);
    },
    cancelEnd: async () => {
      await ipcRenderer.invoke('devpath:pomodoro-cancel-end');
    },
  },
  secrets: {
    has: (name) => ipcRenderer.invoke('devpath:secrets-has', name) as Promise<boolean>,
    // Main returns the error as data, so the page gets the plain Turkish message.
    set: async (name, value) => {
      const result = (await ipcRenderer.invoke('devpath:secrets-set', name, value)) as SecretResult;
      if ('error' in result) throw new Error(result.error);
    },
    clear: async (name) => {
      const result = (await ipcRenderer.invoke('devpath:secrets-clear', name)) as SecretResult;
      if ('error' in result) throw new Error(result.error);
    },
  },
  reminders: {
    refresh: async () => {
      await ipcRenderer.invoke('devpath:reminders-refresh');
    },
  },
  settings: {
    getDataDir: () => ipcRenderer.invoke('devpath:get-data-dir') as Promise<string>,
    // Main returns the error as data, so the page gets the plain Turkish message instead of an IPC-wrapped one.
    changeDataDir: async () => {
      const result = (await ipcRenderer.invoke('devpath:change-data-dir')) as ChangeDataDirResult;
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result.dataDir;
    },
    listBackups: () => ipcRenderer.invoke('devpath:list-backups') as Promise<BackupInfo[]>,
    restoreBackup: async (name) => {
      const result = (await ipcRenderer.invoke(
        'devpath:restore-backup',
        name,
      )) as RestoreBackupResult;
      if (result.error) {
        throw new Error(result.error);
      }
    },
  },
};

contextBridge.exposeInMainWorld('devpath', bridge);
