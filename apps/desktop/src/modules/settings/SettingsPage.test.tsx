import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DevPathBridge } from '../../shared/api/types';
import { SettingsPage } from './SettingsPage';

function stubSettings(changeDataDir: DevPathBridge['settings']['changeDataDir']) {
  const settings = { getDataDir: () => Promise.resolve('C:\\Data'), changeDataDir };
  vi.stubGlobal('devpath', { settings });
  return settings;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SettingsPage', () => {
  it('shows the data folder and that data is not moved', async () => {
    stubSettings(() => Promise.resolve(null));

    render(<SettingsPage />);

    expect(await screen.findByText('C:\\Data')).toBeInTheDocument();
    expect(screen.getByText('Klasörü değiştirmek mevcut verileri taşımaz.')).toBeInTheDocument();
  });

  it('changes the folder and is busy while the switch runs', async () => {
    let finish: (dir: string) => void = () => {};
    const settings = stubSettings(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const change = vi.spyOn(settings, 'changeDataDir');
    render(<SettingsPage />);
    await screen.findByText('C:\\Data');

    fireEvent.click(screen.getByRole('button', { name: 'Klasör seç…' }));

    expect(change).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Değiştiriliyor…' })).toBeDisabled();
    finish('D:\\New');
    expect(await screen.findByText('D:\\New')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Klasör seç…' })).toBeEnabled();
  });

  it('keeps the folder when the dialog is cancelled', async () => {
    stubSettings(() => Promise.resolve(null));
    render(<SettingsPage />);
    await screen.findByText('C:\\Data');

    fireEvent.click(screen.getByRole('button', { name: 'Klasör seç…' }));

    expect(await screen.findByRole('button', { name: 'Klasör seç…' })).toBeEnabled();
    expect(screen.getByText('C:\\Data')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error and enables the button again', async () => {
    stubSettings(() =>
      Promise.reject(new Error('API yeni klasörle başlatılamadı; eski klasöre dönüldü.')),
    );
    render(<SettingsPage />);
    await screen.findByText('C:\\Data');

    fireEvent.click(screen.getByRole('button', { name: 'Klasör seç…' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('eski klasöre dönüldü');
    expect(screen.getByRole('button', { name: 'Klasör seç…' })).toBeEnabled();
  });
});
