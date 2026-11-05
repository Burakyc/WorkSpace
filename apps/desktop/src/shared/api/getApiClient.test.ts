import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiClient } from './getApiClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getApiClient', () => {
  it('asks the bridge for the config once per page load', async () => {
    const getApiConfig = vi.fn(() =>
      Promise.resolve({ baseUrl: 'http://127.0.0.1:1', token: 't' }),
    );
    vi.stubGlobal('devpath', { getApiConfig });

    const [first, second] = await Promise.all([getApiClient(), getApiClient()]);

    expect(first).toBe(second);
    expect(getApiConfig).toHaveBeenCalledOnce();
  });

  it('does not cache a failed lookup', async () => {
    const getApiConfig = vi
      .fn()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValue({ baseUrl: 'http://127.0.0.1:1', token: 't' });
    vi.stubGlobal('devpath', { getApiConfig });

    await expect(getApiClient()).rejects.toThrow('not ready');
    await expect(getApiClient()).resolves.toBeDefined();
  });
});
