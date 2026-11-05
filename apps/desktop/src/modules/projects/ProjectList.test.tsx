import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalsPage } from '../goals/GoalsPage';
import { goal, installFakeGoalsApi, project } from '../goals/testing/fakeGoalsApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

const aspnet = goal({ id: 'a', title: 'Learn ASP.NET Core', createdAt: '2026-11-01T00:00:00Z' });
const english = goal({ id: 'b', title: 'English every day', createdAt: '2026-11-02T00:00:00Z' });

const projectsOf = (goalTitle: string) =>
  screen.findByRole('region', { name: `${goalTitle} projeleri` });

describe('Projects under their goal', () => {
  it('adds a project to a goal in two clicks', async () => {
    const api = installFakeGoalsApi([aspnet, english]);
    render(<GoalsPage />);
    const section = await projectsOf('Learn ASP.NET Core');
    expect(within(section).getByText('Henüz proje yok.')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Proje ekle' }));
    const form = within(section).getByRole('form', { name: 'Yeni proje' });
    expect(within(form).getByLabelText('Proje adı')).toHaveFocus();
    fireEvent.change(within(form).getByLabelText('Proje adı'), { target: { value: 'Todo API' } });
    fireEvent.change(within(form).getByLabelText('Bağlantı (isteğe bağlı)'), {
      target: { value: 'https://github.com/me/todo-api' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Kaydet' }));

    expect(await within(section).findByText('Todo API')).toBeInTheDocument();
    expect(within(section).queryByRole('form')).not.toBeInTheDocument();
    expect(within(await projectsOf('English every day')).queryByText('Todo API')).toBeNull();
    expect(api.projects).toEqual([expect.objectContaining({ goalId: 'a', title: 'Todo API' })]);
  });

  it('opens a project link through the bridge', async () => {
    const api = installFakeGoalsApi([aspnet], {
      projects: [project({ id: 'p', goalId: 'a', title: 'Todo API', url: 'https://github.com/x' })],
    });
    render(<GoalsPage />);
    const section = await projectsOf('Learn ASP.NET Core');

    fireEvent.click(within(section).getByRole('button', { name: 'Bağlantıyı aç' }));

    expect(api.openExternal).toHaveBeenCalledWith('https://github.com/x');
  });

  it('offers no "Proje ekle" on an archived goal', async () => {
    installFakeGoalsApi([{ ...aspnet, archived: true }, english]);
    render(<GoalsPage />);
    await projectsOf('English every day');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Arşivlenenleri göster' }));

    const archived = await projectsOf('Learn ASP.NET Core');
    expect(within(archived).queryByRole('button', { name: 'Proje ekle' })).toBeNull();
  });
});
