import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeContentApi } from '../content/testing/fakeContentApi';
import { StudyPartPanel } from './StudyPartPanel';
import { diLesson } from './testing/lesson';

// Shiki is tested on its own; here code stays plain.
vi.mock('../content/highlight', () => ({ highlightCSharp: () => new Promise(() => undefined) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPanel(partId: string, slug = 'di') {
  render(
    <MemoryRouter>
      <StudyPartPanel part={{ slug, partId, topic: 'Dependency injection', title: 'x' }} />
    </MemoryRouter>,
  );
}

describe('StudyPartPanel', () => {
  it('shows the part with its link, body and exercises', async () => {
    installFakeContentApi({ topics: [diLesson] });
    renderPanel('di-2');

    expect(await screen.findByRole('heading', { name: 'Lifetimes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Dependency injection' })).toHaveAttribute(
      'href',
      '/learning/di/di-2',
    );
    expect(screen.getByText('Scoped, transient, singleton.')).toBeInTheDocument();
    expect(screen.getByText('services.AddScoped<IClock, Clock>();')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Alıştırmalar' })).toBeInTheDocument();
  });

  it.each([
    ['part', 'gone', 'di'],
    ['lesson', 'di-2', 'gone'],
  ])('says so when the %s is gone', async (_, partId, slug) => {
    installFakeContentApi({ topics: [diLesson] });
    renderPanel(partId, slug);

    expect(await screen.findByRole('alert')).toHaveTextContent('Parça bulunamadı.');
  });

  it('says so when the lesson cannot be read', async () => {
    installFakeContentApi({ topics: [diLesson], failTopics: true });
    renderPanel('di-2');

    expect(await screen.findByRole('alert')).toHaveTextContent('Parça yüklenemedi.');
  });
});
