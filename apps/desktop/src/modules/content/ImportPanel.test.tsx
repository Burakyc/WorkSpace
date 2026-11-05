import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportReport } from '../../shared/api/types';
import { ImportPanel, MAX_IMPORT_BYTES } from './ImportPanel';
import { installFakeContentApi } from './testing/fakeContentApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

const report: ImportReport = {
  type: 'vocab',
  topic: 'Meetings',
  slug: 'meetings',
  created: false,
  added: 2,
  skipped: 1,
  levelKept: true,
};

const box = () => screen.getByLabelText('İçe aktarılacak JSON');

describe('ImportPanel', () => {
  it('lists every problem with its line', async () => {
    const api = installFakeContentApi({
      validateErrors: [
        { path: '/items/0', line: 7, message: 'Eksik alan: meaning' },
        { path: '/items/1/q', line: 15, message: 'Bilinmeyen alan: q' },
      ],
    });
    render(<ImportPanel type="vocab" />);

    fireEvent.change(box(), { target: { value: '{ "x": 1 }' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kontrol et' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('2 sorun bulundu:');
    expect(
      within(alert)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Satır 7 · items[0]: Eksik alan: meaning',
      'Satır 15 · items[1].q: Bilinmeyen alan: q',
    ]);
    expect(api.requests).toEqual([
      { method: 'POST', path: '/api/import/validate', body: { type: 'vocab', text: '{ "x": 1 }' } },
    ]);
    expect(box()).toHaveValue('{ "x": 1 }');
  });

  it('says a valid text can be imported', async () => {
    installFakeContentApi();
    render(<ImportPanel type="vocab" />);

    fireEvent.change(box(), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kontrol et' }));

    expect(await screen.findByText('Sorun yok, içe aktarılabilir.')).toBeInTheDocument();
  });

  it('imports, reports the counts and clears the box', async () => {
    const api = installFakeContentApi({ importResult: { errors: [], report } });
    const onImported = vi.fn();
    render(<ImportPanel type="interview" onImported={onImported} />);
    const importButton = screen.getByRole('button', { name: 'İçe aktar' });
    expect(importButton).toBeDisabled();

    fireEvent.change(box(), { target: { value: '{}' } });
    fireEvent.click(importButton);

    expect(
      await screen.findByText('Meetings: 2 öğe eklendi, 1 öğe zaten vardı.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Konu zaten vardı; seviyesi değiştirilmedi.')).toBeInTheDocument();
    expect(box()).toHaveValue('');
    expect(onImported).toHaveBeenCalledWith(report);
    expect(api.requests[0]).toEqual({
      method: 'POST',
      path: '/api/import',
      body: { type: 'interview', text: '{}' },
    });
  });

  it('shows the errors of a refused import', async () => {
    installFakeContentApi({
      importResult: { errors: [{ path: '', line: 1, message: 'JSON metni boş.' }], report: null },
    });
    render(<ImportPanel type="vocab" />);

    fireEvent.change(box(), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Satır 1 · JSON metni boş.');
    expect(box()).toHaveValue('x');
  });

  it('puts a picked file into the box', async () => {
    installFakeContentApi();
    render(<ImportPanel type="vocab" />);

    fireEvent.change(screen.getByLabelText('Ya da bir JSON dosyası seç'), {
      target: { files: [new File(['{ "a": 1 }'], 'cards.json', { type: 'application/json' })] },
    });

    await waitFor(() => expect(box()).toHaveValue('{ "a": 1 }'));
  });

  it('refuses a file over 2 MB without a request', () => {
    const api = installFakeContentApi();
    render(<ImportPanel type="vocab" />);
    const big = new File(['x'], 'big.json');
    Object.defineProperty(big, 'size', { value: MAX_IMPORT_BYTES + 1 });

    fireEvent.change(screen.getByLabelText('Ya da bir JSON dosyası seç'), {
      target: { files: [big] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent("Dosya 2 MB'tan büyük olamaz.");
    expect(api.requests).toEqual([]);
  });

  it('says so when the request fails', async () => {
    installFakeContentApi({ failImport: true });
    render(<ImportPanel type="vocab" />);

    fireEvent.change(box(), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('İçe aktarma yapılamadı.');
  });
});
