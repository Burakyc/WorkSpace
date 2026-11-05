import { contextBridge, ipcRenderer } from 'electron';
import type { ApiConfig, ChangeDataDirResult, DevPathBridge } from '../src/shared/api/types';

const bridge: DevPathBridge = {
  getApiConfig: () => ipcRenderer.invoke('devpath:get-api-config') as Promise<ApiConfig>,
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
