import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LinkRead } from '../../shared/api/types';
import { LinkDraftSection } from './LinkDraftSection';
import { installFakePostsApi } from './testing/fakePostsApi';

const answer: LinkRead = {
  url: 'https://www.youtube.com/watch?v=abc123DEF_4',
  source: 'youtube',
  title: 'How DI works',
  author: 'Some Channel',
  description: 'A walk through lifetimes.',
  error: null,
};

function renderSection(onImported = vi.fn(), styleVersion = 0) {
  return render(
    <MemoryRouter>
      <LinkDraftSection styleVersion={styleVersion} onImported={onImported} />
    </MemoryRouter>,
  );
}

function readLink(url = 'https://youtu.be/abc123DEF_4') {
  fireEvent.change(screen.getByLabelText('Bağlantı'), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Oku' }));
}

const buildButton = () => screen.getByRole('button', { name: 'Promptu hazırla' });
const writeNote = (value = 'My view') =>
  fireEvent.change(screen.getByLabelText('Notun'), { target: { value } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LinkDraftSection', () => {
  it('reads nothing before "Oku" and needs an address for it', () => {
    const api = installFakePostsApi();
    renderSection();

    expect(screen.getByRole('button', { name: 'Oku' })).toBeDisabled();
    expect(screen.queryByLabelText('Başlık')).not.toBeInTheDocument();
    expect(api.requests).toEqual([]);
  });

  it('fills the fields from a read and shows the canonical link', async () => {
    const api = installFakePostsApi({ linkRead: answer });
    renderSection();

    readLink();

    expect(await screen.findByLabelText('Başlık')).toHaveValue('How DI works');
    expect(screen.getByLabelText('Yazar / kanal')).toHaveValue('Some Channel');
    expect(screen.getByLabelText('Açıklama')).toHaveValue('A walk through lifetimes.');
    expect(screen.getByLabelText('Bağlantı')).toHaveValue(answer.url);
    expect(api.requests).toEqual([
      {
        method: 'POST',
        path: '/api/posts/link/read',
        body: { url: 'https://youtu.be/abc123DEF_4' },
      },
    ]);
  });

  it('shows the message and the fields after a failed read', async () => {
    installFakePostsApi({
      linkRead: {
        ...answer,
        title: null,
        author: null,
        description: null,
        error: 'Bağlantı okunamadı. Alanları elle doldurabilirsin.',
      },
    });
    renderSection();

    readLink();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Bağlantı okunamadı/);
    expect(screen.getByLabelText('Başlık')).toHaveValue('');
  });

  it('shows the fields when the request itself fails', async () => {
    installFakePostsApi({ failLinkRead: true });
    renderSection();

    readLink();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Bağlantı okunamadı/);
    expect(screen.getByLabelText('Notun')).toBeInTheDocument();
  });

  it('shows a refused address under its field and no fields', async () => {
    installFakePostsApi({ linkReadErrors: { url: ['Yalnızca https.'] } });
    renderSection();

    readLink('http://127.0.0.1/');

    expect(await screen.findByText('Yalnızca https.')).toBeInTheDocument();
    expect(screen.getByLabelText('Bağlantı')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByLabelText('Başlık')).not.toBeInTheDocument();
  });

  it('needs a title and a note before building', async () => {
    installFakePostsApi({ linkRead: answer });
    renderSection();
    readLink();
    await screen.findByLabelText('Başlık');

    expect(buildButton()).toBeDisabled();
    writeNote('  ');
    expect(buildButton()).toBeDisabled();
    writeNote();
    expect(buildButton()).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Başlık'), { target: { value: '' } });
    expect(buildButton()).toBeDisabled();
  });

  it('builds the prompt from the corrected fields and calls no AI', async () => {
    const api = installFakePostsApi({
      linkRead: answer,
      style: { text: 'Be short.', updatedAt: '2026-11-01T00:00:00Z', history: [] },
    });
    renderSection();
    readLink();
    fireEvent.change(await screen.findByLabelText('Başlık'), { target: { value: 'Fixed title' } });
    writeNote();

    fireEvent.click(buildButton());

    const box = await screen.findByLabelText('Hazırlanan prompt');
    expect((box as HTMLTextAreaElement).value).toContain('Topic: Fixed title');
    expect((box as HTMLTextAreaElement).value).toContain('Be short.');
    expect((box as HTMLTextAreaElement).value).toContain('<analysis>\nlink analysis\n</analysis>');
    expect(api.requests).toContainEqual({
      method: 'POST',
      path: '/api/posts/link/context',
      body: {
        url: answer.url,
        title: 'Fixed title',
        author: 'Some Channel',
        description: 'A walk through lifetimes.',
        note: 'My view',
      },
    });
    expect(api.requests.some((request) => request.path.startsWith('/api/ai/'))).toBe(false);
  });

  it('hides the prompt after a change until it is built again', async () => {
    installFakePostsApi({ linkRead: answer });
    renderSection();
    readLink();
    await screen.findByLabelText('Başlık');
    writeNote();
    fireEvent.click(buildButton());
    await screen.findByLabelText('Hazırlanan prompt');

    writeNote('Another view');

    expect(screen.queryByLabelText('Hazırlanan prompt')).not.toBeInTheDocument();
    fireEvent.click(buildButton());
    expect(await screen.findByLabelText('Hazırlanan prompt')).toBeInTheDocument();
  });

  it('hides the prompt when the style was saved after it', async () => {
    installFakePostsApi({ linkRead: answer });
    const { rerender } = renderSection();
    readLink();
    await screen.findByLabelText('Başlık');
    writeNote();
    fireEvent.click(buildButton());
    await screen.findByLabelText('Hazırlanan prompt');

    rerender(
      <MemoryRouter>
        <LinkDraftSection styleVersion={1} onImported={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText('Hazırlanan prompt')).not.toBeInTheDocument();
  });

  it('shows field errors and a failed build', async () => {
    installFakePostsApi({ linkRead: answer, linkContextErrors: { note: ['Not çok uzun.'] } });
    const { unmount } = renderSection();
    readLink();
    await screen.findByLabelText('Başlık');
    writeNote();
    fireEvent.click(buildButton());
    expect(await screen.findByText('Not çok uzun.')).toBeInTheDocument();
    unmount();

    installFakePostsApi({ linkRead: answer, failLinkContext: true });
    renderSection();
    readLink();
    await screen.findByLabelText('Başlık');
    writeNote();
    fireEvent.click(buildButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Prompt hazırlanamadı.');
  });

  it('reports an import', async () => {
    installFakePostsApi({
      linkRead: answer,
      importReport: {
        type: 'post',
        topic: 'How DI works',
        slug: 'how-di-works',
        created: true,
        added: 1,
        skipped: 0,
        levelKept: false,
      },
    });
    const onImported = vi.fn();
    renderSection(onImported);
    readLink();
    await screen.findByLabelText('Başlık');
    writeNote();
    fireEvent.click(buildButton());

    fireEvent.change(await screen.findByLabelText('İçe aktarılacak JSON'), {
      target: { value: '{}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
  });
});
