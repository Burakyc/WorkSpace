import { createApiClient, type ApiClient } from './client';

let cached: Promise<ApiClient> | undefined;

/**
 * The API client for this page load. The window reloads after a data-folder switch (new port and token),
 * so the cached config is never stale. A failed lookup is not cached.
 */
export function getApiClient(): Promise<ApiClient> {
  cached ??= Promise.resolve()
    .then(() => window.devpath.getApiConfig())
    .then((config) => createApiClient(config))
    .catch((error: unknown) => {
      cached = undefined;
      throw error;
    });
  return cached;
}

/** Tests stub a new bridge per test. */
export function resetApiClient(): void {
  cached = undefined;
}
