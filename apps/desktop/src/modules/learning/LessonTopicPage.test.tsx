import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeContentApi } from '../content/testing/fakeContentApi';
import { LessonTopicPage } from './LessonTopicPage';
import { diLesson } from './testing/lesson';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderLesson(topics = [diLesson]) {
  installFakeContentApi({ topics });
  render(
    <MemoryRouter initialEntries={['/learning/di']}>
      <Routes>
        <Route path="/learning/:slug" element={<LessonTopicPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LessonTopicPage', () => {
  it('lists the parts with their summaries, done checks and progress', async () => {
    renderLesson();

    expect(
      await screen.findByRole('heading', { name: 'Dependency injection' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Başlangıç')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 parça')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar', { name: 'İlerleme' });
    expect(progress).toHaveAttribute('value', '1');
    expect(progress).toHaveAttribute('max', '3');

    const parts = screen.getAllByRole('listitem');
    expect(parts.map((p) => within(p).getByRole('link').textContent)).toEqual([
      'Why DI',
      'Lifetimes',
      'Testing',
    ]);
    expect(within(parts[1]!).getByRole('link')).toHaveAttribute('href', '/learning/di/di-2');
    expect(parts[1]).toHaveTextContent('Scoped, transient, singleton.');
    expect(parts[0]).toHaveTextContent('✓ Tamamlandı');
    expect(parts[1]).not.toHaveTextContent('Tamamlandı');
  });

  it('says so for an unknown lesson', async () => {
    renderLesson([]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Konu bulunamadı.');
  });
});
