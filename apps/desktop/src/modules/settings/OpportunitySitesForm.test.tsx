import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { OpportunitySitesForm } from './OpportunitySitesForm';

const PATIKA = { id: 'patika.dev', name: 'Patika.dev', url: 'https://patika.dev/' };
const CODERSPACE = { id: 'coderspace.io', name: '', url: 'https://coderspace.io/' };

afterEach(() => {
  vi.unstubAllGlobals();
});

const list = () => screen.findByRole('list', { name: 'Takip edilen fırsat siteleri' });

describe('OpportunitySitesForm', () => {
  it('lists sites by name or host and removes one', async () => {
    const api = installFakeGoalsApi([], { opportunitySites: [PATIKA, CODERSPACE] });
    render(<OpportunitySitesForm />);

    const sites = await list();
    expect(within(sites).getByText('Patika.dev')).toBeInTheDocument();
    expect(within(sites).getByText('coderspace.io')).toBeInTheDocument();
    expect(within(sites).getByText('https://coderspace.io/')).toBeInTheDocument();

    fireEvent.click(within(sites).getByRole('button', { name: 'Kaldır: Patika.dev' }));

    await waitFor(() => expect(screen.queryByText('Patika.dev')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Kaldır: coderspace.io' })).toBeInTheDocument();
    expect(api.opportunitySites).toEqual([CODERSPACE]);
  });

  it('shows the empty text', async () => {
    installFakeGoalsApi([], { opportunitySites: [] });
    render(<OpportunitySitesForm />);

    expect(await screen.findByText('Henüz fırsat sitesi yok.')).toBeInTheDocument();
  });

  it('shows an alert when the list cannot be loaded', async () => {
    installFakeGoalsApi([], { failOpportunities: true });
    render(<OpportunitySitesForm />);

    expect(await screen.findByRole('status')).toHaveTextContent('Fırsat siteleri yüklenemedi.');
  });

  it('shows an alert when a site cannot be removed', async () => {
    installFakeGoalsApi([], { opportunitySites: [PATIKA], failOpportunityRemove: true });
    render(<OpportunitySitesForm />);

    fireEvent.click(within(await list()).getByRole('button', { name: 'Kaldır: Patika.dev' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Site kaldırılamadı.');
  });

  it('adds a site with its name, clears the form and lists it', async () => {
    const api = installFakeGoalsApi([], { opportunitySites: [] });
    render(<OpportunitySitesForm />);
    await screen.findByText('Henüz fırsat sitesi yok.');

    fireEvent.change(screen.getByLabelText('Ad (isteğe bağlı)'), { target: { value: 'Kariyer' } });
    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'kariyer.net' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    expect(within(await list()).getByText('Kariyer')).toBeInTheDocument();
    expect(screen.getByLabelText('Ad (isteğe bağlı)')).toHaveValue('');
    expect(screen.getByLabelText('Adres')).toHaveValue('');
    expect(api.opportunitySites).toEqual([
      { id: 'kariyer.net', name: 'Kariyer', url: 'https://kariyer.net/' },
    ]);
  });

  it('shows the API error under the field and keeps the input', async () => {
    installFakeGoalsApi([], { opportunitySites: [PATIKA] });
    render(<OpportunitySitesForm />);
    await list();
    const field = screen.getByLabelText('Adres');

    fireEvent.change(field, { target: { value: 'http://example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    expect(await screen.findByText('Sadece https adresleri eklenebilir.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue('http://example.com');
  });
});
