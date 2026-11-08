import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeContentApi } from '../content/testing/fakeContentApi';
import { AiModesSection } from './AiModesSection';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AiModesSection', () => {
  it('shows one select per module with its mode', async () => {
    installFakeContentApi();
    render(<AiModesSection />);

    for (const label of ['İngilizce', 'Öğrenme', 'Mülakat']) {
      expect(await screen.findByLabelText(label)).toHaveValue('copyPaste');
    }
  });

  it('saves a change for that module only', async () => {
    const api = installFakeContentApi();
    render(<AiModesSection />);
    const select = await screen.findByLabelText('Mülakat');
    await vi.waitFor(() => expect(select).toBeEnabled());

    fireEvent.change(select, { target: { value: 'copyPaste' } });

    await vi.waitFor(() =>
      expect(api.requests).toContainEqual({
        method: 'PUT',
        path: '/api/settings/ai-modes/interview',
        body: { mode: 'copyPaste' },
      }),
    );
  });

  it('shows the folder only in file mode, and saves and clears it', async () => {
    const api = installFakeContentApi({
      aiModes: { interview: 'file' },
      pickedFolder: 'D:\\Inbox',
    });
    render(<AiModesSection />);

    expect(await screen.findByText('Klasör seçilmedi.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Klasör seç…' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Klasör seç…' }));

    expect(await screen.findByText('D:\\Inbox')).toBeInTheDocument();
    expect(api.requests).toContainEqual({
      method: 'PUT',
      path: '/api/settings/ai-inbox/interview',
      body: { folder: 'D:\\Inbox' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Kaldır' }));

    expect(await screen.findByText('Klasör seçilmedi.')).toBeInTheDocument();
  });

  it('goes back and says so when the save fails', async () => {
    installFakeContentApi({ failAiModeSave: true });
    render(<AiModesSection />);
    const select = await screen.findByLabelText('Öğrenme');
    await vi.waitFor(() => expect(select).toBeEnabled());

    fireEvent.change(select, { target: { value: 'copyPaste' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Kaydedilemedi.');
    expect(select).toHaveValue('copyPaste');
  });
});
