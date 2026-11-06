import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeContentApi } from '../content/testing/fakeContentApi';
import { LessonPartPage } from './LessonPartPage';
import { diLesson } from './testing/lesson';

// Shiki is tested on its own; here code stays plain.
vi.mock('../content/highlight', () => ({ highlightCSharp: () => new Promise(() => undefined) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPart(partId: string, options = {}) {
  const api = installFakeContentApi({ topics: [diLesson], ...options });
  render(
    <MemoryRouter initialEntries={[`/learning/di/${partId}`]}>
      <Routes>
        <Route path="/learning/:slug/:partId" element={<LessonPartPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return api;
}

describe('LessonPartPage', () => {
  it('shows the part with paragraphs, code and exercises', async () => {
    renderPart('di-2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Lifetimes' })).toBeInTheDocument();
    expect(screen.getByText('Parça 2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Scoped, transient, singleton.')).toBeInTheDocument();
    expect(screen.getByText(/Three lifetimes exist\.\s*Each has a use\./)).toBeInTheDocument();
    expect(screen.getByText('services.AddScoped<IClock, Clock>();')).toBeInTheDocument();
    expect(screen.getByText('Choose carefully.')).toBeInTheDocument();
    const exercises = screen.getByRole('region', { name: 'Alıştırmalar' });
    expect(within(exercises).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '← Dependency injection' })).toHaveAttribute(
      'href',
      '/learning/di',
    );
    expect(screen.getByRole('link', { name: '← Önceki' })).toHaveAttribute(
      'href',
      '/learning/di/di-1',
    );
    expect(screen.getByRole('link', { name: 'Sonraki →' })).toHaveAttribute(
      'href',
      '/learning/di/di-3',
    );
  });

  it('moves between parts and has no links past the ends', async () => {
    renderPart('di-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Why DI' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '← Önceki' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Alıştırmalar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Sonraki →' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Sonraki →' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Testing' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sonraki →' })).not.toBeInTheDocument();
  });

  it('toggles the done mark', async () => {
    const api = renderPart('di-2');
    const button = await screen.findByRole('button', { name: 'Tamamlandı' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tamamlandı' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tamamlandı' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tamamlandı' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );

    expect(api.requests.filter((r) => r.method === 'PUT')).toEqual([
      { method: 'PUT', path: '/api/content/lesson/di/items/di-2/mark', body: { mark: 'done' } },
      { method: 'PUT', path: '/api/content/lesson/di/items/di-2/mark', body: { mark: null } },
    ]);
  });

  it('says so when the mark cannot be saved or the part is unknown', async () => {
    renderPart('di-2', { failMark: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Tamamlandı' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kaydedilemedi.');
  });

  it('says so for an unknown part', async () => {
    renderPart('missing');

    expect(await screen.findByRole('alert')).toHaveTextContent('Parça bulunamadı.');
  });
});
