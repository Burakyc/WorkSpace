import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DevPathBridge } from '../shared/api/types';
import { ApiStatus } from './ApiStatus';

const config = { baseUrl: 'http://127.0.0.1:4321', token: 'secret' };

function stubBridge(getApiConfig: DevPathBridge['getApiConfig']) {
  vi.stubGlobal('devpath', { getApiConfig } satisfies Pick<DevPathBridge, 'getApiConfig'>);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiStatus', () => {
  it('shows connecting, then connected when /api/health is ok', async () => {
    stubBridge(() => Promise.resolve(config));
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ status: 'ok', version: '0.0.1' }))),
    );

    render(<ApiStatus />);

    expect(screen.getByRole('status')).toHaveTextContent('API: bağlanıyor…');
    expect(await screen.findByText('API: bağlı')).toBeInTheDocument();
  });

  it('shows disconnected when the health request fails', async () => {
    stubBridge(() => Promise.resolve(config));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    render(<ApiStatus />);

    expect(await screen.findByText('API: bağlantı yok')).toBeInTheDocument();
  });

  it('shows disconnected when the bridge fails', async () => {
    stubBridge(() => Promise.reject(new Error('not allowed')));

    render(<ApiStatus />);

    expect(await screen.findByText('API: bağlantı yok')).toBeInTheDocument();
  });
});
