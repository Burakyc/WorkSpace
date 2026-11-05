import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteNode } from '../../shared/api/types';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { NotesPage } from './NotesPage';
import { noteNode } from './testing/noteNode';

afterEach(() => {
  vi.unstubAllGlobals();
});

function Location() {
  return <output aria-label="Adres">{useLocation().pathname}</output>;
}

function renderAt(path: string, notes: NoteNode[] = []) {
  const api = installFakeGoalsApi([], { notes });
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
    expect(await screen.findByRole('heading', { name: 'DI', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Sayfa düzenleyici yakında geliyor.')).toBeInTheDocument();
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
