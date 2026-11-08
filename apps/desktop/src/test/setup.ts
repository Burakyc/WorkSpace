import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetApiClient } from '../shared/api/getApiClient';

// Role queries are slow on a busy machine; a longer wait only matters when an element is late or missing.
configure({ asyncUtilTimeout: 5000 });

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
