import { contextBridge, ipcRenderer } from 'electron';
import type { ApiConfig, DevPathBridge } from '../src/shared/api/types';

const bridge: DevPathBridge = {
  getApiConfig: () => ipcRenderer.invoke('devpath:get-api-config') as Promise<ApiConfig>,
};

contextBridge.exposeInMainWorld('devpath', bridge);
