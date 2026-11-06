import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetApiClient } from '../shared/api/getApiClient';

afterEach(() => {
  cleanup();
  // Each test stubs its own window.devpath.
  resetApiClient();
});

// jsdom has no modal dialogs: open and close them like the browser does (close fires "close").
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event('close'));
};
