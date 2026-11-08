import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Goal, NoteNode, Project } from '../../shared/api/types';
import { ProjectDraftSection } from './ProjectDraftSection';
import { installFakePostsApi } from './testing/fakePostsApi';

const goal: Goal = {
  id: 'g',
  title: 'Learn ASP.NET Core',
  description: null,
  targetPomodoros: null,
  archived: false,
  createdAt: '2026-11-01T00:00:00Z',
};
const project: Project = {
  id: 'p',
  goalId: 'g',
  title: 'Todo API',
  url: null,
  archived: false,
  createdAt: '2026-11-01T00:00:00Z',
};
const page = (id: string, title: string): NoteNode => ({
  id,
  parentId: null,
  kind: 'page',
  title,
  order: 0,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
});

function renderSection(onImported = vi.fn(), styleVersion = 0) {
  return render(
    <MemoryRouter>
      <ProjectDraftSection styleVersion={styleVersion} onImported={onImported} />
    </MemoryRouter>,
  );
}

const pick = async () =>
  fireEvent.change(await screen.findByLabelText('Proje'), { target: { value: 'p' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectDraftSection', () => {
  it('asks for a project when there is none', async () => {
    installFakePostsApi({ goals: [goal] });
    renderSection();

    expect(await screen.findByRole('link', { name: 'Hedefler' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Proje')).not.toBeInTheDocument();
  });

  it('builds the prompt from the project, pages and style, and calls nothing else', async () => {
    const api = installFakePostsApi({
      goals: [goal],
      projects: [project],
      notes: [page('n1', 'DI notes')],
      style: { text: 'Be short.', updatedAt: '2026-11-01T00:00:00Z', history: [] },
    });
    renderSection();

    expect(screen.queryByLabelText('Hazırlanan prompt')).not.toBeInTheDocument();
    await pick();

    const box = await screen.findByLabelText('Hazırlanan prompt');
    expect((box as HTMLTextAreaElement).value).toContain('Topic: Todo API');
    expect((box as HTMLTextAreaElement).value).toContain('Be short.');
    expect((box as HTMLTextAreaElement).value).toContain('Project: Todo API');
    expect(screen.queryByText(/Stil promptun boş/)).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Promptu kopyala' })).toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText('DI notes'));

    await waitFor(() =>
      expect(api.requests).toContainEqual({
        method: 'POST',
        path: '/api/posts/project-context',
        body: { projectId: 'p', noteIds: ['n1'] },
      }),
    );
    expect(api.requests.some((request) => request.path.startsWith('/api/ai/'))).toBe(false);
  });

  it('says when the style is empty', async () => {
    installFakePostsApi({ goals: [goal], projects: [project] });
    renderSection();
    await pick();

    expect(await screen.findByText(/Stil promptun boş/)).toBeInTheDocument();
  });

  it('disables more pages at the limit', async () => {
    installFakePostsApi({
      goals: [goal],
      projects: [project],
      notes: Array.from({ length: 11 }, (_, index) => page(`n${index}`, `Page ${index}`)),
    });
    renderSection();

    for (let index = 0; index < 10; index++) {
      fireEvent.click(await screen.findByLabelText(`Page ${index}`));
    }

    expect(screen.getByLabelText('Page 10')).toBeDisabled();
    expect(screen.getByLabelText('Page 0')).toBeEnabled();
  });

  it('shows an alert when the context cannot be read', async () => {
    installFakePostsApi({ goals: [goal], projects: [project], failContext: true });
    renderSection();
    await pick();

    expect(await screen.findByRole('alert')).toHaveTextContent('Proje bilgileri okunamadı.');
    expect(screen.queryByLabelText('Hazırlanan prompt')).not.toBeInTheDocument();
  });

  it('reports an import', async () => {
    installFakePostsApi({
      goals: [goal],
      projects: [project],
      importReport: {
        type: 'post',
        topic: 'Todo API',
        slug: 'todo-api',
        created: true,
        added: 1,
        skipped: 0,
        levelKept: false,
      },
    });
    const onImported = vi.fn();
    renderSection(onImported);
    await pick();

    fireEvent.change(await screen.findByLabelText('İçe aktarılacak JSON'), {
      target: { value: '{}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'İçe aktar' }));

    expect(
      await screen.findByText('Todo API: 1 taslak eklendi, 0 taslak zaten vardı.'),
    ).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledOnce();
  });
});
