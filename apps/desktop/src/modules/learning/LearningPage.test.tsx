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

  it('imports through the lesson plan panel and keeps the summary', async () => {
    installFakeContentApi({
      importTopic: fakeTopic(
        { type: 'lesson', slug: 'di', topic: 'Dependency injection', level: 'beginner' },
        [{ title: 'Why DI', summary: 's', body: 'b' }],
      ),
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ders planı' }));
    expect(screen.getByRole('heading', { name: 'Ders planı' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Dependency injection' } });
    fireEvent.click(screen.getByRole('button', { name: 'Promptu oluştur' }));
    expect(await screen.findAllByRole('heading', { name: 'İçe aktar' })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByRole('link', { name: 'Dependency injection' })).toBeInTheDocument();
    expect(screen.getByText(/1 öğe eklendi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ders planı' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // The new lesson is now offered as a topic to continue.
    expect(document.querySelector('datalist option')).toHaveValue('Dependency injection');
  });

  it('opens one panel at a time', async () => {
    installFakeContentApi({
      topics: [fakeTopic({ type: 'lesson', slug: 'di', topic: 'DI', level: 'advanced' })],
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ders planı' }));
    fireEvent.click(screen.getByRole('button', { name: 'İçerik ekle' }));
    expect(screen.queryByRole('heading', { name: 'Ders planı' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ders planı' }));
    expect(screen.queryByRole('button', { name: 'Promptu kopyala' })).not.toBeInTheDocument();
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
