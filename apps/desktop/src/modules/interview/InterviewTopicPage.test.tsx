import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fakeTopic,
  installFakeContentApi,
  type FakeTopic,
} from '../content/testing/fakeContentApi';
import { InterviewTopicPage } from './InterviewTopicPage';

// Shiki is tested on its own; here the code stays plain.
vi.mock('./highlight', () => ({ highlightCSharp: () => new Promise(() => undefined) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

const topic = fakeTopic(
  {
    type: 'interview',
    slug: 'aspnet',
    topic: 'ASP.NET Core',
    level: 'intermediate',
    tags: ['backend'],
  },
  [
    {
      question: 'What is middleware?',
      answer: 'A pipeline step.\nIt runs in order.',
      difficulty: 'easy',
      tags: ['pipeline'],
    },
    {
      question: 'Scoped vs singleton?',
      answer: 'Lifetimes.',
      difficulty: 'hard',
      code: 'services.AddScoped<IClock, Clock>();',
      tags: ['di'],
      mark: 'practised',
    },
    { question: 'What is Kestrel?', answer: 'The server.', difficulty: 'medium' },
  ],
);

function renderTopic(topics: FakeTopic[] = [topic], options = {}) {
  const api = installFakeContentApi({ topics, ...options });
  render(
    <MemoryRouter initialEntries={['/interview/aspnet']}>
      <Routes>
        <Route path="/interview/:slug" element={<InterviewTopicPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return api;
}

const cards = () => screen.getAllByRole('listitem');

describe('InterviewTopicPage', () => {
  it('shows questions with the answer hidden until asked', async () => {
    renderTopic();

    expect(await screen.findByRole('heading', { name: 'ASP.NET Core' })).toBeInTheDocument();
    expect(screen.getByText('3 soru · 1 çalışıldı')).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
    expect(cards()[1]).toHaveTextContent('Zor');
    expect(cards()[1]).toHaveTextContent('#di');
    expect(screen.queryByText('Lifetimes.')).not.toBeInTheDocument();

    const show = within(cards()[1]!).getByRole('button', { name: 'Cevabı göster' });
    fireEvent.click(show);

    expect(show).toHaveAttribute('aria-expanded', 'true');
    expect(show).toHaveTextContent('Cevabı gizle');
    expect(screen.getByText('Lifetimes.')).toBeInTheDocument();
    expect(screen.getByText('services.AddScoped<IClock, Clock>();')).toBeInTheDocument();
  });

  it('filters by difficulty, question tag and state', async () => {
    renderTopic();
    await screen.findByRole('heading', { name: 'ASP.NET Core' });

    fireEvent.change(screen.getByLabelText('Zorluk'), { target: { value: 'hard' } });
    expect(screen.getByText('1 / 3 soru')).toBeInTheDocument();
    expect(cards()[0]).toHaveTextContent('Scoped vs singleton?');

    fireEvent.change(screen.getByLabelText('Zorluk'), { target: { value: 'all' } });
    const tagOptions = within(screen.getByLabelText('Etiket'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(tagOptions).toEqual(['Hepsi', '#di', '#pipeline']);
    fireEvent.change(screen.getByLabelText('Etiket'), { target: { value: 'pipeline' } });
    expect(screen.getByText('1 / 3 soru')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Etiket'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Durum'), { target: { value: 'open' } });
    expect(screen.getByText('2 / 3 soru')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Zorluk'), { target: { value: 'hard' } });
    expect(screen.getByText('Bu filtreye uyan soru yok.')).toBeInTheDocument();
  });

  it('hides the tag filter when no question has tags', async () => {
    renderTopic([
      fakeTopic({ type: 'interview', slug: 'aspnet', topic: 'ASP.NET Core' }, [
        { question: 'q', answer: 'a', difficulty: 'easy' },
      ]),
    ]);
    await screen.findByRole('heading', { name: 'ASP.NET Core' });

    expect(screen.queryByLabelText('Etiket')).not.toBeInTheDocument();
  });

  it('toggles the practised mark', async () => {
    const api = renderTopic();
    await screen.findByRole('heading', { name: 'ASP.NET Core' });
    const practise = within(cards()[0]!).getByRole('button', { name: 'Çalıştım' });
    expect(practise).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(practise);

    await waitFor(() =>
      expect(within(cards()[0]!).getByRole('button', { name: 'Çalıştım' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(screen.getByText('3 soru · 2 çalışıldı')).toBeInTheDocument();
    fireEvent.click(within(cards()[0]!).getByRole('button', { name: 'Çalıştım' }));
    await waitFor(() => expect(screen.getByText('3 soru · 1 çalışıldı')).toBeInTheDocument());
    expect(api.requests.filter((r) => r.method === 'PUT').map((r) => r.body)).toEqual([
      { mark: 'practised' },
      { mark: null },
    ]);
  });

  it('says so when the mark cannot be saved', async () => {
    renderTopic([topic], { failMark: true });
    await screen.findByRole('heading', { name: 'ASP.NET Core' });

    fireEvent.click(within(cards()[0]!).getByRole('button', { name: 'Çalıştım' }));

    expect(await within(cards()[0]!).findByRole('alert')).toHaveTextContent('Kaydedilemedi.');
  });

  it('says so for an unknown topic', async () => {
    renderTopic([]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Konu bulunamadı.');
  });
});
