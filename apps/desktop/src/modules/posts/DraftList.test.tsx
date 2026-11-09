import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostDraft } from '../../shared/api/types';
import { DraftList } from './DraftList';
import { installFakePostsApi } from './testing/fakePostsApi';

const draft: PostDraft = {
  id: 'd1',
  topic: 'Todo API',
  title: 'What DI taught me',
  body: 'First paragraph.\n\nSecond.',
  hashtags: ['aspnetcore', 'learning'],
  sourceLink: 'https://github.com/me/todo',
  imageSuggestion: 'A screenshot',
  createdAt: '2026-11-09T10:00:00Z',
  updatedAt: '2026-11-09T10:00:00Z',
};

function stubClipboard() {
  const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DraftList', () => {
  it('says when there are no drafts or they cannot be loaded', async () => {
    installFakePostsApi();
    const { unmount } = render(<DraftList version={0} />);
    expect(await screen.findByText(/Henüz taslak yok/)).toBeInTheDocument();
    unmount();

    installFakePostsApi({ failDrafts: true });
    render(<DraftList version={0} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Taslaklar yüklenemedi.');
  });

  it('shows the fields as text and offers no way to post', async () => {
    installFakePostsApi({ drafts: [draft] });
    render(<DraftList version={0} />);

    expect(await screen.findByRole('heading', { name: 'What DI taught me' })).toBeInTheDocument();
    expect(screen.getByText(/Todo API ·/)).toBeInTheDocument();
    expect(screen.getByText('#aspnetcore #learning')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/me/todo')).toBeInTheDocument();
    expect(screen.getByText('Görsel: A screenshot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /paylaş|gönder|post/i })).not.toBeInTheDocument();
  });

  it('copies body, hashtags and link', async () => {
    installFakePostsApi({ drafts: [draft] });
    const writeText = stubClipboard();
    render(<DraftList version={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Kopyala' }));

    expect(await screen.findByText('Kopyalandı.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(
      'First paragraph.\n\nSecond.\n\n#aspnetcore #learning\n\nhttps://github.com/me/todo',
    );
  });

  it('opens the link through the bridge', async () => {
    const api = installFakePostsApi({ drafts: [draft] });
    render(<DraftList version={0} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Kaynağı aç/ }));

    expect(api.openExternal).toHaveBeenCalledWith('https://github.com/me/todo');
  });

  it('edits a draft and reloads the list', async () => {
    const api = installFakePostsApi({ drafts: [draft] });
    render(<DraftList version={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Düzenle' }));
    fireEvent.change(screen.getByLabelText('Metin'), { target: { value: 'New body' } });
    fireEvent.change(screen.getByLabelText(/Hashtag/), { target: { value: '#one two' } });
    fireEvent.change(screen.getByLabelText('Kaynak bağlantısı'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('New body', { selector: 'p' })).toBeInTheDocument();
    expect(api.requests.at(-2)).toEqual({
      method: 'PUT',
      path: '/api/posts/drafts/d1',
      body: {
        title: draft.title,
        body: 'New body',
        hashtags: ['one', 'two'],
        sourceLink: null,
        imageSuggestion: draft.imageSuggestion,
      },
    });
  });

  it('shows a field error and keeps the form', async () => {
    installFakePostsApi({ drafts: [draft], draftError: { body: ['Metin çok uzun.'] } });
    render(<DraftList version={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Düzenle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Metin çok uzun.')).toBeInTheDocument();
    expect(screen.getByLabelText('Metin')).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks before deleting', async () => {
    const api = installFakePostsApi({ drafts: [draft] });
    render(<DraftList version={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sil' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Evet, sil' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    expect(api.requests.filter((request) => request.method === 'DELETE')).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Evet, sil' }));

    expect(await screen.findByText(/Henüz taslak yok/)).toBeInTheDocument();
    expect(api.requests).toContainEqual({
      method: 'DELETE',
      path: '/api/posts/drafts/d1',
      body: undefined,
    });
  });
});
