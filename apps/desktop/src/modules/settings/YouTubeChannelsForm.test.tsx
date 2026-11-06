import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { YouTubeChannelsForm } from './YouTubeChannelsForm';

const ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('YouTubeChannelsForm', () => {
  it('adds a channel and shows its name, then removes it', async () => {
    const api = installFakeGoalsApi([], { youTubeTitles: { [ID]: 'Google for Developers' } });
    render(<YouTubeChannelsForm />);
    expect(await screen.findByText(/Henüz kanal yok/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Kanal ID'si veya adresi"), { target: { value: ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    const list = await screen.findByRole('list', { name: 'Takip edilen kanallar' });
    expect(within(list).getByText('Google for Developers')).toBeInTheDocument();
    expect(screen.getByLabelText("Kanal ID'si veya adresi")).toHaveValue('');
    expect(api.youTubeChannels).toEqual([{ id: ID, title: 'Google for Developers' }]);

    fireEvent.click(within(list).getByRole('button', { name: 'Kaldır: Google for Developers' }));

    expect(await screen.findByText(/Henüz kanal yok/)).toBeInTheDocument();
    expect(api.youTubeChannels).toEqual([]);
  });

  it('shows the API error under the field and keeps the text', async () => {
    installFakeGoalsApi([], { youTubeChannels: [{ id: ID, title: 'Google for Developers' }] });
    render(<YouTubeChannelsForm />);
    await screen.findByRole('list', { name: 'Takip edilen kanallar' });
    const field = screen.getByLabelText("Kanal ID'si veya adresi");

    fireEvent.change(field, { target: { value: ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    expect(await screen.findByText('Bu kanal zaten ekli.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue(ID);
  });
});
