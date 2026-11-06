import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fakeTopic,
  installFakeContentApi,
  type FakeTopic,
} from '../content/testing/fakeContentApi';
import { VocabTopicPage } from './VocabTopicPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

const meetings = fakeTopic({ type: 'vocab', slug: 'meetings', topic: 'Meetings', tags: ['work'] }, [
  { term: 'follow up on', meaning: 'takip etmek', example: 'Follow up.', mark: 'known' },
  {
    term: 'touch base',
    meaning: 'kısaca görüşmek',
    definition: 'to talk briefly',
    example: "Let's touch base.",
  },
  { term: 'circle back', meaning: 'geri dönmek', example: 'Circle back later.', mark: 'repeat' },
]);

function renderTopic(topics: FakeTopic[] = [meetings], options = {}) {
  const api = installFakeContentApi({ topics, ...options });
  render(
    <MemoryRouter initialEntries={['/english/meetings']}>
      <Routes>
        <Route path="/english/:slug" element={<VocabTopicPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return api;
}

describe('VocabTopicPage', () => {
  it('shows every card with its mark', async () => {
    renderTopic();

    expect(await screen.findByRole('heading', { name: 'Meetings' })).toBeInTheDocument();
    expect(screen.getByText('3 kart · 1 biliyorum · 1 tekrar')).toBeInTheDocument();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('follow up on');
    expect(cards[0]).toHaveTextContent('Biliyorum');
    expect(cards[1]).toHaveTextContent('to talk briefly');
    expect(cards[1]).toHaveTextContent("Let's touch base.");
    expect(cards[2]).toHaveTextContent('Tekrar et');
    expect(screen.getByRole('link', { name: '← İngilizce' })).toHaveAttribute('href', '/english');
  });

  it('practises the repeat card first, then the unmarked one', async () => {
    const api = renderTopic();
    fireEvent.click(await screen.findByRole('button', { name: 'Çalış' }));

    const practice = screen.getByRole('region', { name: 'Çalışma' });
    expect(practice).toHaveTextContent('1 / 2');
    expect(practice).toHaveTextContent('circle back');
    expect(practice).not.toHaveTextContent('geri dönmek');

    fireEvent.click(within(practice).getByRole('button', { name: 'Çevir' }));
    expect(practice).toHaveTextContent('geri dönmek');
    fireEvent.click(within(practice).getByRole('button', { name: 'Biliyorum' }));

    expect(await within(practice).findByText('touch base')).toBeInTheDocument();
    expect(practice).toHaveTextContent('2 / 2');
    expect(within(practice).getByRole('button', { name: 'Çevir' })).toHaveFocus();
    fireEvent.click(within(practice).getByRole('button', { name: 'Çevir' }));
    expect(practice).toHaveTextContent('to talk briefly');
    fireEvent.click(within(practice).getByRole('button', { name: 'Tekrar et' }));

    expect(await screen.findByText('Bitti: 2 kart çalışıldı.')).toBeInTheDocument();
    expect(api.requests.filter((r) => r.method === 'PUT')).toEqual([
      {
        method: 'PUT',
        path: '/api/content/vocab/meetings/items/meetings-3/mark',
        body: { mark: 'known' },
      },
      {
        method: 'PUT',
        path: '/api/content/vocab/meetings/items/meetings-2/mark',
        body: { mark: 'repeat' },
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Listeye dön' }));

    expect(await screen.findByText('3 kart · 2 biliyorum · 1 tekrar')).toBeInTheDocument();
  });

  it('offers every card when all are known', async () => {
    const known = fakeTopic({ type: 'vocab', slug: 'meetings', topic: 'Meetings' }, [
      { term: 'a', meaning: 'b', example: 'c', mark: 'known' },
      { term: 'd', meaning: 'e', example: 'f', mark: 'known' },
    ]);
    renderTopic([known]);
    fireEvent.click(await screen.findByRole('button', { name: 'Çalış' }));

    expect(screen.getByText('Hepsini biliyorsun.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hepsini çalış' }));

    expect(screen.getByRole('region', { name: 'Çalışma' })).toHaveTextContent('1 / 2');
  });

  it('keeps the card when the mark cannot be saved', async () => {
    renderTopic([meetings], { failMark: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Çalış' }));
    fireEvent.click(screen.getByRole('button', { name: 'Çevir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Biliyorum' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kaydedilemedi.');
    expect(screen.getByRole('region', { name: 'Çalışma' })).toHaveTextContent('circle back');
  });

  it('says so for an unknown topic', async () => {
    renderTopic([]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Konu bulunamadı.');
  });
});
