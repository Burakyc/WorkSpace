import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { OpportunitiesCard } from './OpportunitiesCard';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderCard() {
  render(
    <MemoryRouter>
      <OpportunitiesCard />
    </MemoryRouter>,
  );
}

describe('OpportunitiesCard', () => {
  it('lists the sites by name or host and opens one in the browser', async () => {
    const api = installFakeGoalsApi([], {
      opportunitySites: [
        { id: 'coderspace.io', name: 'Coderspace', url: 'https://coderspace.io/' },
        { id: 'kariyer.net', name: '', url: 'https://kariyer.net/' },
      ],
    });
    renderCard();

    const list = await screen.findByRole('list', { name: 'Fırsat siteleri' });
    expect(within(list).getByRole('button', { name: 'kariyer.net' })).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Coderspace' }));

    expect(api.openExternal).toHaveBeenCalledWith('https://coderspace.io/');
  });

  it('links to Ayarlar when there are no sites', async () => {
    installFakeGoalsApi([], { opportunitySites: [] });
    renderCard();

    expect(await screen.findByText(/Henüz fırsat sitesi yok/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Ayarlar'dan site ekle" })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('shows a failed load inside the card', async () => {
    installFakeGoalsApi([], { failOpportunities: true });
    renderCard();

    const card = screen.getByRole('region', { name: 'Fırsat siteleri' });
    expect(await within(card).findByText('Fırsat siteleri yüklenemedi.')).toBeInTheDocument();
  });
});
