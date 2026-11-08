import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('offers the other modes disabled', async () => {
    installFakeContentApi();
    render(<AiContentPanel module="english" type="vocab" />);

    await screen.findByRole('button', { name: 'Promptu kopyala' });
    expect(screen.getByRole('option', { name: 'Kopyala-yapıştır' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Dosyadan içe aktar' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'API (yakında)' })).toBeDisabled();
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
