import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../app/AppRoutes';
import type { DevStatus } from '../../shared/api/types';
import { clearErrors, recordError } from '../../shared/errors/errorLog';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';

const devStatus: DevStatus = {
  errors: [
    {
      at: '2026-01-01T09:00:00Z',
      source: 'NoteService',
      kind: 'IOException',
      path: 'PUT api/notes/{id}/content',
    },
  ],
  files: [
    { name: 'goals.json', folder: false, files: 1, bytes: 512 },
    { name: 'notes', folder: true, files: 3, bytes: 2048 },
  ],
  totalBytes: 2560,
};

function renderAt(path: string, options: Parameters<typeof installFakeGoalsApi>[1] = {}) {
  installFakeGoalsApi([], options);
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  clearErrors();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DevPanelPage', () => {
  it('shows health, API and renderer errors newest first, and the file sizes', async () => {
    recordError('HTTP 500', 'GET /api/sessions/tags');
    renderAt('/dev', { devStatus });

    expect(await within(section('API')).findByText('Durum: çalışıyor')).toBeInTheDocument();
    expect(within(section('API')).getByText('Sürüm: 0.0.1')).toBeInTheDocument();

    const errors = section('Son hatalar');
    const rows = await within(errors).findAllByRole('row');
    expect(rows.slice(1).map((r) => within(r).getAllByRole('cell')[1]?.textContent)).toEqual([
      'Arayüz',
      'API (NoteService)',
    ]);
    expect(within(errors).getByText('PUT api/notes/{id}/content')).toBeInTheDocument();

    const files = section('Veri dosyaları');
    expect(within(files).getByText('notes/')).toBeInTheDocument();
    expect(within(files).getByText('2 KB')).toBeInTheDocument();
    expect(within(files).getByText('Toplam: 2,5 KB')).toBeInTheDocument();
  });

  it('keeps the renderer errors when the API part fails, and says when the API does not answer', async () => {
    recordError('TypeError', '/notes/{…}');
    renderAt('/dev', { failDev: true, failHealth: true });

    expect(await within(section('API')).findByText('Durum: yanıt yok')).toBeInTheDocument();
    const errors = section('Son hatalar');
    expect(await within(errors).findByText('API hataları okunamadı.')).toBeInTheDocument();
    expect(await within(errors).findByText('TypeError')).toBeInTheDocument();
    // The failed /api/dev request itself is listed too.
    expect(within(errors).getByText('HTTP 500')).toBeInTheDocument();
  });

  it('opens with Ctrl+Shift+D and goes back with it', async () => {
    renderAt('/english');
    fireEvent.click(screen.getByRole('link', { name: 'Hedefler' }));
    await screen.findByRole('heading', { level: 1, name: 'Hedefler' });

    fireEvent.keyDown(document.body, { key: 'D', ctrlKey: true, shiftKey: true });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Geliştirici paneli' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'D', ctrlKey: true, shiftKey: true });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Hedefler' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
  });

  it('goes to Ana Sayfa when the panel was the first page', async () => {
    renderAt('/dev');
    await screen.findByRole('heading', { level: 1, name: 'Geliştirici paneli' });

    fireEvent.keyDown(document.body, { key: 'D', ctrlKey: true, shiftKey: true });

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Sayfa' })).toBeInTheDocument();
  });
});
