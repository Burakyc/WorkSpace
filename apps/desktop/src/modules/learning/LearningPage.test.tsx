import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTopic, installFakeContentApi } from '../content/testing/fakeContentApi';
import { LearningPage } from './LearningPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  render(
    <MemoryRouter>
      <LearningPage />
    </MemoryRouter>,
  );
}

describe('LearningPage', () => {
  it('imports a lesson from the empty state and shows it', async () => {
    installFakeContentApi({
      importTopic: fakeTopic(
        { type: 'lesson', slug: 'di', topic: 'Dependency injection', level: 'beginner' },
        [
          { title: 'Why DI', summary: 's', body: 'b' },
          { title: 'Lifetimes', summary: 's', body: 'b' },
        ],
      ),
    });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    const link = await screen.findByRole('link', { name: 'Dependency injection' });
    expect(link).toHaveAttribute('href', '/learning/di');
    expect(link.closest('li')).toHaveTextContent('Başlangıç');
    expect(link.closest('li')).toHaveTextContent('2 parça');
  });

  it('counts done parts', async () => {
    installFakeContentApi({
      topics: [
        fakeTopic({ type: 'lesson', slug: 'di', topic: 'DI', level: 'advanced' }, [
          { title: 'a', summary: 's', body: 'b', mark: 'done' },
          { title: 'b', summary: 's', body: 'b' },
          { title: 'c', summary: 's', body: 'b' },
        ]),
      ],
    });
    renderPage();

    expect(await screen.findByText('3 parça · 1 tamamlandı')).toBeInTheDocument();
  });
});
