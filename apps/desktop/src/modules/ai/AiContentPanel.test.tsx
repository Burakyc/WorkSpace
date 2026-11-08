import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiRunResult } from '../../shared/api/types';
import { fakeTopic, installFakeContentApi } from '../content/testing/fakeContentApi';
import { AiContentPanel } from './AiContentPanel';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AiContentPanel', () => {
  it('shows the copy-paste flow for the saved mode and reports an import', async () => {
    installFakeContentApi({
      importTopic: fakeTopic({ type: 'vocab', slug: 'a', topic: 'A' }, [{ term: 't' }]),
    });
    const onImported = vi.fn();
    render(<AiContentPanel module="english" type="vocab" onImported={onImported} />);

    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
    expect(screen.getByLabelText('Yapay zekâ modu')).toHaveValue('copyPaste');

    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByText('A: 1 öğe eklendi, 0 öğe zaten vardı.')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledOnce();
  });

  it('offers every mode', async () => {
    installFakeContentApi();
    render(<AiContentPanel module="english" type="vocab" />);

    await screen.findByRole('button', { name: 'Promptu kopyala' });
    expect(screen.getByRole('option', { name: 'Kopyala-yapıştır' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Dosyadan içe aktar' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'API' })).toBeEnabled();
  });

  it('falls back to copy-paste when the settings cannot be read', async () => {
    installFakeContentApi({ failSettings: true });
    render(<AiContentPanel module="english" type="vocab" />);

    expect(await screen.findByLabelText('İçe aktarılacak JSON')).toBeInTheDocument();
  });

  it('offers the file mode without a folder and asks for one first', async () => {
    installFakeContentApi({ aiModes: { english: 'file' } });
    render(<AiContentPanel module="english" type="vocab" />);

    expect(await screen.findByText('Klasör seçilmedi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();
    expect(screen.queryByLabelText('İçe aktarılacak JSON')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'İçe aktar' })).toBeDisabled();
  });

  it('lists the inbox, imports the valid files and lists again', async () => {
    const api = installFakeContentApi({
      aiModes: { english: 'file' },
      aiInbox: { english: 'C:\\Inbox' },
      inboxOtherTypes: 2,
      inboxFiles: [
        { name: 'good.json', errors: [] },
        {
          name: 'bad.json',
          errors: [{ path: '/items/0/meaning', line: 14, message: 'Eksik alan: meaning' }],
        },
      ],
    });
    const onImported = vi.fn();
    render(<AiContentPanel module="english" type="vocab" onImported={onImported} />);

    expect(await screen.findByText('C:\\Inbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByText('Geçerli')).toBeInTheDocument();
    expect(
      screen.getByText('Satır 14 · items[0].meaning: Eksik alan: meaning'),
    ).toBeInTheDocument();
    expect(screen.getByText('Hata raporu: bad.json.errors.txt')).toBeInTheDocument();
    expect(screen.getByText('Başka türden 2 dosya atlandı.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Geçerlileri içe aktar (1)' }));

    expect(
      await screen.findByText('good.json: 1 öğe eklendi, 0 öğe zaten vardı.'),
    ).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Geçerli')).not.toBeInTheDocument());
    expect(screen.getByText('bad.json')).toBeInTheDocument();
    expect(api.requests.filter((r) => r.path === '/api/inbox/english/import')[0]?.body).toEqual({
      type: 'vocab',
      names: ['good.json'],
    });
  });

  it('says so when there is no new file', async () => {
    installFakeContentApi({ aiModes: { english: 'file' }, aiInbox: { english: 'C:\\Inbox' } });
    render(<AiContentPanel module="english" type="vocab" />);

    await screen.findByText('C:\\Inbox');
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(await screen.findByText('Yeni dosya yok.')).toBeInTheDocument();
  });

  describe('API mode', () => {
    const saved: AiRunResult = {
      error: null,
      errors: [],
      report: {
        type: 'vocab',
        topic: 'A',
        slug: 'a',
        created: true,
        added: 2,
        skipped: 0,
        levelKept: false,
      },
      usage: { inputTokens: 1234, outputTokens: 2345, costUsd: 0.0518 },
      output: '{}',
    };

    function renderApi(options: Parameters<typeof installFakeContentApi>[0] = {}) {
      const api = installFakeContentApi({ aiModes: { english: 'api' }, ...options });
      const onImported = vi.fn();
      render(
        <MemoryRouter>
          <AiContentPanel module="english" type="vocab" onImported={onImported} />
        </MemoryRouter>,
      );
      const runs = () => api.requests.filter((r) => r.path === '/api/ai/run');
      return { api, onImported, runs };
    }

    it('shows the template, the prices and the estimate, and calls nothing on open', async () => {
      const { runs } = renderApi();

      const note = await screen.findByText(/Tahmini üst sınır|tahmini üst sınır/);
      expect(note).toHaveTextContent(
        'Claude Opus 5.5 · 1M giriş tokeni $4,00 · 1M çıkış tokeni $20,00',
      );
      expect(note).toHaveTextContent('Sen onaylamadan hiçbir çağrı yapılmaz.');
      const box = screen.getByLabelText('Prompt') as HTMLTextAreaElement;
      expect(box.value).toMatch(/^Topic:/);

      fireEvent.change(box, { target: { value: 'x'.repeat(3_000_000) } });
      expect(note).toHaveTextContent('tahmini üst sınır: $4,32');
      expect(runs()).toEqual([]);
    });

    it('sends only after the confirmation, once, with the edited prompt', async () => {
      const { runs, onImported } = renderApi({ aiRun: saved });
      fireEvent.change(await screen.findByLabelText('Prompt'), { target: { value: 'Topic: DI' } });
      await screen.findByText(/Claude Opus 5.5 ·/);

      fireEvent.click(screen.getByRole('button', { name: 'Yapay zekâya gönder' }));
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Tahmini üst sınır');
      expect(screen.getByRole('button', { name: 'Ücretli çağrıyı onayla' })).toHaveFocus();
      expect(runs()).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(runs()).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'Yapay zekâya gönder' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ücretli çağrıyı onayla' }));

      expect(await screen.findByText('A: 2 öğe eklendi, 0 öğe zaten vardı.')).toBeInTheDocument();
      expect(screen.getByText('1.234 giriş, 2.345 çıkış tokeni · $0,05')).toBeInTheDocument();
      expect(onImported).toHaveBeenCalledOnce();
      expect(runs()).toEqual([
        {
          method: 'POST',
          path: '/api/ai/run',
          body: { provider: 'claude', type: 'vocab', prompt: 'Topic: DI' },
        },
      ]);
      expect(screen.queryByText('Yapay zekânın cevabı')).not.toBeInTheDocument();
    });

    it('shows the errors and the raw answer of an invalid answer', async () => {
      const { onImported } = renderApi({
        aiRun: {
          error: null,
          errors: [{ path: '/items/0', line: 6, message: 'Eksik alan: meaning' }],
          report: null,
          usage: { inputTokens: 1, outputTokens: 2, costUsd: 0.00004 },
          output: 'not valid',
        },
      });
      await screen.findByText(/Claude Opus 5.5 ·/);

      fireEvent.click(screen.getByRole('button', { name: 'Yapay zekâya gönder' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ücretli çağrıyı onayla' }));

      expect(await screen.findByText(/Cevap kaydedilmedi. 1 sorun bulundu/)).toBeInTheDocument();
      expect(screen.getByText('Satır 6 · items[0]: Eksik alan: meaning')).toBeInTheDocument();
      expect(screen.getByLabelText('Yapay zekânın cevabı')).toHaveValue('not valid');
      expect(onImported).not.toHaveBeenCalled();
    });

    it('shows a provider error', async () => {
      renderApi({
        aiRun: {
          error: 'API anahtarı geçersiz.',
          errors: [],
          report: null,
          usage: null,
          output: null,
        },
      });
      await screen.findByText(/Claude Opus 5.5 ·/);

      fireEvent.click(screen.getByRole('button', { name: 'Yapay zekâya gönder' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ücretli çağrıyı onayla' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('API anahtarı geçersiz.');
    });

    it('asks for a key and does not let a call go without one', async () => {
      const { runs } = renderApi({ aiProvider: 'gemini' });

      expect(await screen.findByText(/API anahtarı kayıtlı değil/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: "Ayarlar'dan ekle" })).toHaveAttribute(
        'href',
        '/settings',
      );
      expect(screen.getByRole('button', { name: 'Yapay zekâya gönder' })).toBeDisabled();
      expect(runs()).toEqual([]);
    });

    it('changes the provider and its note', async () => {
      const { api } = renderApi();
      const select = await screen.findByLabelText('Sağlayıcı');
      await screen.findByText(/Claude Opus 5.5 ·/);

      fireEvent.change(select, { target: { value: 'gemini' } });

      expect(
        await screen.findByText(/Gemini 3.1 Pro · 1M giriş tokeni \$2,00/),
      ).toBeInTheDocument();
      expect(api.requests).toContainEqual({
        method: 'PUT',
        path: '/api/settings/ai-provider',
        body: { provider: 'gemini' },
      });
    });
  });

  it('copies the given prompt instead of the template', async () => {
    installFakeContentApi();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<AiContentPanel module="learning" type="lesson" prompt="Split this topic." />);

    fireEvent.click(await screen.findByRole('button', { name: 'Promptu kopyala' }));

    expect(await screen.findByText('Kopyalandı.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('Split this topic.');
  });
});
