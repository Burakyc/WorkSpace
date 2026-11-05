import type { DevPathBridge } from './types';

declare global {
  interface Window {
    devpath: DevPathBridge;
  }
}

export {};
