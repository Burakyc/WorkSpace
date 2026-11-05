import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteNode } from '../../shared/api/types';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { NotesPage } from './NotesPage';
import { noteNode } from './testing/noteNode';

// BlockNote needs a real browser; a textarea stands in for it. Typing sends one paragraph block.
vi.mock('./NoteEditor', () => ({
  NoteEditor: ({
    initialBlocks,
    onChange,
  }: {
    initialBlocks: unknown[];
    onChange(blocks: unknown[]): void;
  }) => (
    <textarea
      aria-label="Editör"
      defaultValue={JSON.stringify(initialBlocks)}
      onChange={(event) => onChange([{ type: 'paragraph', text: event.target.value }])}
    />
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function Location() {
  return <output aria-label="Adres">{useLocation().pathname}</output>;
}

function renderAt(
  path: string,
  notes: NoteNode[] = [],
  options: Parameters<typeof installFakeGoalsApi>[1] = {},
) {
  const api = installFakeGoalsApi([], { ...options, notes });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/:id" element={<NotesPage />} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
  return api;
}

const tree = () => screen.getByRole('navigation', { name: 'Not ağacı' });

const openMenu = async (title: string) =>
  fireEvent.click(await screen.findByRole('button', { name: `${title} için işlemler` }));

const folderWithPages = [
  noteNode({ id: 'f', title: 'ASP.NET', kind: 'folder' }),
  noteNode({ id: 'di', title: 'DI', parentId: 'f', order: 0 }),
  noteNode({ id: 'mw', title: 'Middleware', parentId: 'f', order: 1 }),
];

describe('NotesPage', () => {
  it('starts empty and creates a page in rename mode', async () => {
    const api = renderAt('/notes');

    fireEvent.click(await screen.findByRole('button', { name: /Yeni sayfa/ }));
    const field = await screen.findByRole('textbox', { name: 'Başlık' });
    expect(field).toHaveValue('Adsız sayfa');

    fireEvent.change(field, { target: { value: 'Dependency injection' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(
      await within(tree()).findByRole('link', { name: 'Dependency injection' }),
    ).toBeInTheDocument();
    expect(api.notes.map((n) => [n.title, n.kind])).toEqual([['Dependency injection', 'page']]);
    expect(screen.queryByRole('textbox', { name: 'Başlık' })).not.toBeInTheDocument();
  });

  it('shows an empty state with a message', async () => {
    renderAt('/notes');
    expect(await screen.findByText('Henüz not yok.')).toBeInTheDocument();
  });

  it('opens a page and adds a child folder with a breadcrumb', async () => {
    renderAt('/notes', [noteNode({ id: 'p', title: 'DI' })]);

    fireEvent.click(
      await within(await screen.findByRole('navigation', { name: 'Not ağacı' })).findByRole(
        'link',
        { name: 'DI' },
      ),
    );
    expect(await screen.findByRole('textbox', { name: 'Sayfa başlığı' })).toHaveValue('DI');
    expect(await screen.findByRole('textbox', { name: 'Editör' })).toHaveValue('[]');
    expect(screen.getByRole('status', { name: 'Adres' })).toHaveTextContent('/notes/p');

    await openMenu('DI');
    fireEvent.click(screen.getByRole('button', { name: 'Alt klasör ekle' }));
    const field = await screen.findByRole('textbox', { name: 'Başlık' });
    fireEvent.change(field, { target: { value: 'Examples' } });
    fireEvent.blur(field);

    fireEvent.click(await within(tree()).findByRole('link', { name: 'Examples' }));
    const breadcrumb = await screen.findByRole('navigation', { name: 'Konum' });
    expect(within(breadcrumb).getByRole('link', { name: 'DI' })).toHaveAttribute(
      'href',
      '/notes/p',
    );
  });

  it('shows the API error under the title field', async () => {
    renderAt('/notes', [noteNode({ id: 'p', title: 'DI' })]);

    await openMenu('DI');
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden adlandır' }));
    const field = screen.getByRole('textbox', { name: 'Başlık' });
    fireEvent.change(field, { target: { value: '  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(await screen.findByText('Başlık gerekli.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('moves an item down among its siblings', async () => {
    renderAt('/notes', folderWithPages);

    await openMenu('DI');
    fireEvent.click(screen.getByRole('button', { name: 'Aşağı taşı' }));

    await waitFor(() =>
      expect(
        within(tree())
          .getAllByRole('link')
          .map((l) => l.textContent),
      ).toEqual(['ASP.NET', 'Middleware', 'DI']),
    );
  });

  it('deletes an item and its children after confirming', async () => {
    const api = renderAt('/notes/di', folderWithPages);

    await openMenu('ASP.NET');
    fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Silme onayı' });
    expect(confirm).toHaveTextContent('“ASP.NET” silinsin mi? 2 alt öğe de silinecek.');

    fireEvent.click(within(confirm).getByRole('button', { name: 'Vazgeç' }));
    expect(api.notes).toHaveLength(3);

    await openMenu('ASP.NET');
    fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sil' }));

    expect(await screen.findByText('Henüz not yok.')).toBeInTheDocument();
    expect(api.notes).toEqual([]);
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Adres' })).toHaveTextContent(/^\/notes$/),
    );
  });

  it('moves an item with the move panel, offering valid targets only', async () => {
    const api = renderAt('/notes', [
      ...folderWithPages,
      noteNode({ id: 'other', title: 'Other', kind: 'folder', order: 1 }),
    ]);

    await openMenu('ASP.NET');
    fireEvent.click(screen.getByRole('button', { name: 'Taşı…' }));
    const panel = screen.getByRole('dialog', { name: 'ASP.NET taşı' });
    const select = within(panel).getByRole('combobox', { name: 'Nereye?' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['En üst seviye', 'Other']);

    fireEvent.change(select, { target: { value: 'other' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Taşı' }));

    await waitFor(() => expect(api.notes.find((n) => n.id === 'f')?.parentId).toBe('other'));
  });

  it('moves an item by drag and drop', async () => {
    const api = renderAt('/notes', [
      ...folderWithPages,
      noteNode({ id: 'p', title: 'Loose page', order: 1 }),
    ]);
    await screen.findByRole('navigation', { name: 'Not ağacı' });
    const row = async (title: string) =>
      (await within(tree()).findByRole('link', { name: title })).parentElement!;

    fireEvent.dragStart(await row('Loose page'));
    fireEvent.dragOver(await row('ASP.NET'));
    fireEvent.drop(await row('ASP.NET'));
    await waitFor(() => expect(api.notes.find((n) => n.id === 'p')?.parentId).toBe('f'));

    fireEvent.dragStart(await row('Loose page'));
    fireEvent.drop(screen.getByText('En üste'));
    await waitFor(() => expect(api.notes.find((n) => n.id === 'p')?.parentId).toBeNull());

    const before = api.fetchFn.mock.calls.length;
    fireEvent.dragStart(await row('ASP.NET'));
    fireEvent.dragOver(await row('DI'));
    fireEvent.drop(await row('DI'));
    expect(api.fetchFn.mock.calls.length).toBe(before);
  });

  it('says when the open note does not exist', async () => {
    renderAt('/notes/missing', folderWithPages);
    expect(await screen.findByText('Not bulunamadı.')).toBeInTheDocument();
  });

  it('shows a load error', async () => {
    installFakeGoalsApi([], { failNotes: true });
    render(
      <MemoryRouter initialEntries={['/notes']}>
        <Routes>
          <Route path="/notes" element={<NotesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Notlar yüklenemedi.');
  });
});

describe('page editor', () => {
  const pages = [
    noteNode({ id: 'a', title: 'DI', order: 0 }),
    noteNode({ id: 'b', title: 'Middleware', order: 1 }),
    noteNode({ id: 'f', title: 'Folder', kind: 'folder', order: 2 }),
  ];
  const stored = [{ type: 'heading', content: 'Hello' }];

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a page in the editor with its blocks; a folder has no editor', async () => {
    renderAt('/notes/a', pages, { contents: { a: stored } });
    expect(await screen.findByRole('textbox', { name: 'Editör' })).toHaveValue(
      JSON.stringify(stored),
    );

    fireEvent.click(within(tree()).getByRole('link', { name: 'Folder' }));
    expect(await screen.findByRole('heading', { name: 'Folder', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Editör' })).not.toBeInTheDocument();
  });

  it('saves one second after a change, and at once when another page opens', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const api = renderAt('/notes/a', pages);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Editör' }), {
      target: { value: 'first' },
    });
    expect(api.contents.a).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.contents.a).toEqual([{ type: 'paragraph', text: 'first' }]);
    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Editör' }), {
      target: { value: 'second' },
    });
    fireEvent.click(within(tree()).getByRole('link', { name: 'Middleware' }));
    await waitFor(() => expect(api.contents.a).toEqual([{ type: 'paragraph', text: 'second' }]));
  });

  it('shows a failed save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt('/notes/a', pages, { failContentSave: true });

    fireEvent.change(await screen.findByRole('textbox', { name: 'Editör' }), {
      target: { value: 'x' },
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(
      await screen.findByText('Kaydedilemedi. Yazmaya devam edince tekrar denenecek.'),
    ).toBeInTheDocument();
  });

  it('renames the page from its title; Escape restores it', async () => {
    const api = renderAt('/notes/a', pages);
    const title = await screen.findByRole('textbox', { name: 'Sayfa başlığı' });

    fireEvent.change(title, { target: { value: 'Old' } });
    fireEvent.keyDown(title, { key: 'Escape' });
    expect(title).toHaveValue('DI');

    fireEvent.change(title, { target: { value: 'Dependency injection' } });
    fireEvent.blur(title);
    expect(
      await within(tree()).findByRole('link', { name: 'Dependency injection' }),
    ).toBeInTheDocument();
    expect(api.notes.find((n) => n.id === 'a')?.title).toBe('Dependency injection');
  });

  it('saves a pending change when the app closes', async () => {
    const api = renderAt('/notes/a', pages);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Editör' }), {
      target: { value: 'last words' },
    });
    await api.closeApp();

    expect(api.contents.a).toEqual([{ type: 'paragraph', text: 'last words' }]);
  });
});
