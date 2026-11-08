import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTopic, installFakeContentApi } from '../content/testing/fakeContentApi';
import { EnglishPage } from './EnglishPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

const meetings = fakeTopic({ type: 'vocab', slug: 'meetings', topic: 'Meetings', tags: ['work'] }, [
  { term: 'follow up on', meaning: 'takip etmek', example: 'e', mark: 'known' },
  { term: 'touch base', meaning: 'görüşmek', example: 'e', mark: 'repeat' },
  { term: 'circle back', meaning: 'geri dönmek', example: 'e' },
]);

function renderPage() {
  render(
    <MemoryRouter>
      <EnglishPage />
    </MemoryRouter>,
  );
}

describe('EnglishPage', () => {
  it('imports the first topic from the empty state and then shows it', async () => {
    const api = installFakeContentApi({
      importTopic: fakeTopic(
        {
          type: 'vocab',
          slug: 'phrasal-verbs',
          topic: 'Phrasal verbs',
          level: 'B1',
          tags: ['work'],
        },
        [
          { term: 'a', meaning: 'b', example: 'c' },
          { term: 'd', meaning: 'e', example: 'f' },
        ],
      ),
    });
    renderPage();

    expect(await screen.findByText('İlk içeriğini aşağıdan ekle.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    const link = await screen.findByRole('link', { name: 'Phrasal verbs' });
    expect(link).toHaveAttribute('href', '/english/phrasal-verbs');
    const row = link.closest('li')!;
    expect(row).toHaveTextContent('B1');
    expect(row).toHaveTextContent('#work');
    expect(row).toHaveTextContent('2 kart');
    expect(
      screen.getByText('Phrasal verbs: 2 öğe eklendi, 0 öğe zaten vardı.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'İçerik ekle' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(api.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /api/content/vocab',
      'GET /api/settings',
      'POST /api/import',
      'GET /api/content/vocab',
    ]);
  });

  it('lists topics with their counts and toggles the import panel', async () => {
    installFakeContentApi({ topics: [meetings] });
    renderPage();

    const row = (await screen.findByRole('link', { name: 'Meetings' })).closest('li')!;
    expect(within(row).getByText('3 kart · 1 biliyorum · 1 tekrar')).toBeInTheDocument();
    expect(screen.queryByLabelText('İçe aktarılacak JSON')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'İçerik ekle' });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByLabelText('İçe aktarılacak JSON')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
  });

  it('says so when the topics cannot be loaded', async () => {
    installFakeContentApi({ failTopics: true });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Konular yüklenemedi.');
  });
});
