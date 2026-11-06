import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BackupInfo, DevPathBridge } from '../../shared/api/types';
import { BackupsSection } from './BackupsSection';

const backups: BackupInfo[] = [
  { name: '2026-11-06-140509', kind: 'beforeRestore' },
  { name: '2026-11-04', kind: 'daily' },
];

function stubSettings(
  list: DevPathBridge['settings']['listBackups'],
  restoreBackup: DevPathBridge['settings']['restoreBackup'] = () => new Promise(() => {}),
) {
  const settings = { listBackups: list, restoreBackup: vi.fn(restoreBackup) };
  vi.stubGlobal('devpath', { settings });
  return settings;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BackupsSection', () => {
  it('lists daily and pre-restore backups', async () => {
    stubSettings(() => Promise.resolve(backups));

    render(<BackupsSection />);

    expect(await screen.findByText('6 Kasım 2026 14:05 · Geri yükleme öncesi')).toBeInTheDocument();
    expect(screen.getByText('4 Kasım 2026')).toBeInTheDocument();
  });

  it('shows the empty and the error state', async () => {
    stubSettings(() => Promise.resolve([]));
    const { unmount } = render(<BackupsSection />);
    expect(await screen.findByText('Henüz yedek yok.')).toBeInTheDocument();
    unmount();

    stubSettings(() => Promise.reject(new Error('ipc')));
    render(<BackupsSection />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Yedekler okunamadı.');
  });

  it('asks before restoring and is busy while it runs', async () => {
    const settings = stubSettings(() => Promise.resolve(backups));
    render(<BackupsSection />);
    await screen.findByText('4 Kasım 2026');
    const [, restoreOld] = screen.getAllByRole('button', { name: 'Geri yükle' });

    fireEvent.click(restoreOld!);
    expect(
      screen.getByText('4 Kasım 2026 yedeği geri yüklensin mi? Mevcut veriler önce yedeklenir.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    fireEvent.click(restoreOld!);
    const dialog = screen.getByRole('alertdialog', { name: 'Geri yükleme onayı' });
    fireEvent.click(dialog.querySelector('button')!);

    expect(settings.restoreBackup).toHaveBeenCalledWith('2026-11-04');
    expect(screen.getByRole('button', { name: 'Geri yükleniyor…' })).toBeDisabled();
    for (const button of screen.getAllByRole('button', { name: 'Geri yükle' })) {
      expect(button).toBeDisabled();
    }
  });

  it('shows a failed restore and keeps the list', async () => {
    stubSettings(
      () => Promise.resolve(backups),
      () => Promise.reject(new Error('Yedek bulunamadı.')),
    );
    render(<BackupsSection />);
    await screen.findByText('4 Kasım 2026');

    fireEvent.click(screen.getAllByRole('button', { name: 'Geri yükle' })[1]!);
    fireEvent.click(screen.getByRole('alertdialog').querySelector('button') as HTMLButtonElement);

    expect(await screen.findByRole('alert')).toHaveTextContent('Yedek bulunamadı.');
    expect(screen.getByText('4 Kasım 2026')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Geri yükle' })) {
      expect(button).toBeEnabled();
    }
  });
});
