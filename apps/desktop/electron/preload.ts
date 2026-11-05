import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ApiConfig, ChangeDataDirResult, DevPathBridge } from '../src/shared/api/types';

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
  pomodoro: {
    scheduleEnd: async (endsAt, title, body) => {
      await ipcRenderer.invoke('devpath:pomodoro-schedule-end', endsAt, title, body);
    },
    cancelEnd: async () => {
      await ipcRenderer.invoke('devpath:pomodoro-cancel-end');
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
  },
};

contextBridge.exposeInMainWorld('devpath', bridge);
