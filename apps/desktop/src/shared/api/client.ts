import type { ApiConfig, HealthResponse } from './types';

export const TOKEN_HEADER = 'X-DevPath-Token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API request ${path} failed with status ${status}.`);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  getHealth(): Promise<HealthResponse>;
}

export function createApiClient(config: ApiConfig, fetchFn: typeof fetch = fetch): ApiClient {
  async function get<T>(path: string): Promise<T> {
    const response = await fetchFn(`${config.baseUrl}${path}`, {
      headers: { [TOKEN_HEADER]: config.token },
    });
    if (!response.ok) {
      throw new ApiError(response.status, path);
    }
    return (await response.json()) as T;
  }

  return {
    getHealth: () => get<HealthResponse>('/api/health'),
  };
}
