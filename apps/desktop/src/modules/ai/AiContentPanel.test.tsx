import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('option', { name: 'Dosyadan içe aktar (yakında)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'API (yakında)' })).toBeDisabled();
  });

  it('falls back to copy-paste when the settings cannot be read', async () => {
    installFakeContentApi({ failSettings: true });
    render(<AiContentPanel module="english" type="vocab" />);

    expect(await screen.findByLabelText('İçe aktarılacak JSON')).toBeInTheDocument();
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
