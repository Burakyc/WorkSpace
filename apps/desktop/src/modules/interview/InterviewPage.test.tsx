import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTopic, installFakeContentApi } from '../content/testing/fakeContentApi';
import { InterviewPage } from './InterviewPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  render(
    <MemoryRouter>
      <InterviewPage />
    </MemoryRouter>,
  );
}

describe('InterviewPage', () => {
  it('imports pasted AI JSON and shows the topic (README "Adding content")', async () => {
    installFakeContentApi({
      importTopic: fakeTopic(
        {
          type: 'interview',
          slug: 'middleware',
          topic: 'Middleware',
          level: 'intermediate',
          tags: ['backend'],
        },
        [
          { question: 'q1', answer: 'a1', difficulty: 'easy' },
          { question: 'q2', answer: 'a2', difficulty: 'hard' },
        ],
      ),
    });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    const link = await screen.findByRole('link', { name: 'Middleware' });
    expect(link).toHaveAttribute('href', '/interview/middleware');
    const row = link.closest('li');
    expect(row).toHaveTextContent('Orta');
    expect(row).toHaveTextContent('#backend');
    expect(row).toHaveTextContent('2 soru');
  });

  it('counts practised questions', async () => {
    installFakeContentApi({
      topics: [
        fakeTopic({ type: 'interview', slug: 'di', topic: 'DI', level: 'advanced' }, [
          { question: 'a', answer: 'a', difficulty: 'easy', mark: 'practised' },
          { question: 'b', answer: 'b', difficulty: 'easy' },
          { question: 'c', answer: 'c', difficulty: 'easy' },
        ]),
      ],
    });
    renderPage();

    expect(await screen.findByText('3 soru · 1 çalışıldı')).toBeInTheDocument();
    expect(screen.getByText('İleri')).toBeInTheDocument();
  });
});
