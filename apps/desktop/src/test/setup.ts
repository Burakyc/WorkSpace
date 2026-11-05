import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetApiClient } from '../shared/api/getApiClient';

afterEach(() => {
  cleanup();
  // Each test stubs its own window.devpath.
  resetApiClient();
});
