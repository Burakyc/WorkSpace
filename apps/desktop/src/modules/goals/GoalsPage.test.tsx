import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalsPage } from './GoalsPage';
import { goal, installFakeGoalsApi } from './testing/fakeGoalsApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

const older = goal({
  id: 'a',
  title: 'Learn ASP.NET Core',
  targetPomodoros: 20,
  createdAt: '2026-11-01T00:00:00Z',
});
const newer = goal({ id: 'b', title: 'English every day', createdAt: '2026-11-02T00:00:00Z' });

async function cardTitles() {
  const cards = await screen.findAllByRole('article');
  return cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent);
}

describe('GoalsPage list', () => {
  it('shows the empty state when there are no goals', async () => {
    installFakeGoalsApi();

    render(<GoalsPage />);

    expect(await screen.findByText('İlk hedefini oluşturarak başla.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Hedefler' })).toBeInTheDocument();
  });

  it('lists goals newest first with their targets', async () => {
    installFakeGoalsApi([older, newer]);

    render(<GoalsPage />);

    expect(await cardTitles()).toEqual(['English every day', 'Learn ASP.NET Core']);
    expect(
      within(screen.getByRole('article', { name: 'Learn ASP.NET Core' })).getByText(
        'Hedef: 20 pomodoro',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'English every day' })).getByText('Hedef yok'),
    ).toBeInTheDocument();
  });

  it('hides archived goals until the toggle is on', async () => {
    installFakeGoalsApi([older, newer]);
    render(<GoalsPage />);
    const card = await screen.findByRole('article', { name: 'English every day' });

    fireEvent.click(within(card).getByRole('button', { name: 'Arşivle' }));

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('article', { name: 'English every day' }),
    );
    expect(await cardTitles()).toEqual(['Learn ASP.NET Core']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Arşivlenenleri göster' }));
    const archived = screen.getByRole('article', { name: 'English every day' });
    expect(within(archived).getByText('Arşivlendi')).toBeInTheDocument();
    expect(within(archived).getByRole('button', { name: 'Geri al' })).toBeInTheDocument();
  });

  it('restores an archived goal', async () => {
    installFakeGoalsApi([older, { ...newer, archived: true }]);
    render(<GoalsPage />);
    expect(await screen.findByText('Learn ASP.NET Core')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Arşivlenenleri göster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri al' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Arşivlenenleri göster' }));

    expect(await screen.findByRole('article', { name: 'English every day' })).toBeInTheDocument();
    expect(screen.queryByText('Arşivlendi')).not.toBeInTheDocument();
  });

  it('says so when every goal is archived', async () => {
    installFakeGoalsApi([{ ...older, archived: true }]);

    render(<GoalsPage />);

    expect(await screen.findByText('Aktif hedef yok.')).toBeInTheDocument();
  });
});

describe('GoalsPage form', () => {
  it('creates a goal from the empty state in two clicks', async () => {
    const api = installFakeGoalsApi();
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Yeni hedef' }));
    const form = screen.getByRole('form', { name: 'Yeni hedef' });
    expect(within(form).getByLabelText('Başlık')).toHaveFocus();
    fireEvent.change(within(form).getByLabelText('Başlık'), {
      target: { value: 'Learn ASP.NET Core' },
    });
    fireEvent.change(within(form).getByLabelText('Açıklama'), { target: { value: 'Todo API' } });
    fireEvent.change(within(form).getByLabelText('Hedef pomodoro (isteğe bağlı)'), {
      target: { value: '20' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Kaydet' }));

    const card = await screen.findByRole('article', { name: 'Learn ASP.NET Core' });
    expect(within(card).getByText('Todo API')).toBeInTheDocument();
    expect(within(card).getByText('Hedef: 20 pomodoro')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(api.goals).toHaveLength(1);
  });

  it('puts a new goal at the top of the list', async () => {
    installFakeGoalsApi([older]);
    render(<GoalsPage />);
    await screen.findByRole('article', { name: 'Learn ASP.NET Core' });

    fireEvent.click(screen.getByRole('button', { name: 'Yeni hedef' }));
    fireEvent.change(screen.getByLabelText('Başlık'), { target: { value: 'Newest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await screen.findByRole('article', { name: 'Newest' });
    expect(await cardTitles()).toEqual(['Newest', 'Learn ASP.NET Core']);
  });

  it('edits a goal in place', async () => {
    installFakeGoalsApi([older]);
    render(<GoalsPage />);
    const card = await screen.findByRole('article', { name: 'Learn ASP.NET Core' });

    fireEvent.click(within(card).getByRole('button', { name: 'Düzenle' }));
    const form = screen.getByRole('form', { name: 'Hedefi düzenle' });
    expect(within(form).getByLabelText('Başlık')).toHaveValue('Learn ASP.NET Core');
    expect(within(form).getByLabelText('Hedef pomodoro (isteğe bağlı)')).toHaveValue(20);
    fireEvent.change(within(form).getByLabelText('Başlık'), { target: { value: 'Master DI' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByRole('article', { name: 'Master DI' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Learn ASP.NET Core' })).not.toBeInTheDocument();
  });

  it('shows validation errors next to the field and keeps the form open', async () => {
    installFakeGoalsApi([older]);
    render(<GoalsPage />);
    await screen.findByRole('article', { name: 'Learn ASP.NET Core' });

    fireEvent.click(screen.getByRole('button', { name: 'Yeni hedef' }));
    fireEvent.change(screen.getByLabelText('Başlık'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    const title = screen.getByLabelText('Başlık');
    expect(await screen.findByText('Başlık gerekli.')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Başlık gerekli.');
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  });

  it('closes the form on cancel without sending anything', async () => {
    const api = installFakeGoalsApi([older]);
    render(<GoalsPage />);
    await screen.findByRole('article', { name: 'Learn ASP.NET Core' });
    const requestsBefore = api.fetchFn.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Yeni hedef' }));
    fireEvent.change(screen.getByLabelText('Başlık'), { target: { value: 'Never saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(api.fetchFn.mock.calls.length).toBe(requestsBefore);
  });
});

describe('GoalsPage progress', () => {
  it('shows progress against the target with a bar', async () => {
    installFakeGoalsApi([older], {
      progress: [{ goalId: 'a', completedSessions: 7, totalMinutes: 175, percent: 35 }],
    });
    render(<GoalsPage />);

    const card = await screen.findByRole('article', { name: 'Learn ASP.NET Core' });

    expect(await within(card).findByText('7 / 20 pomodoro · %35')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'İlerleme' })).toHaveAttribute(
      'value',
      '35',
    );
  });

  it('shows session count and time without a target', async () => {
    installFakeGoalsApi([newer], {
      progress: [{ goalId: 'b', completedSessions: 3, totalMinutes: 60, percent: null }],
    });
    render(<GoalsPage />);

    const card = await screen.findByRole('article', { name: 'English every day' });

    expect(await within(card).findByText('3 pomodoro · 1 sa')).toBeInTheDocument();
    expect(within(card).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows zero before any session', async () => {
    installFakeGoalsApi([older]);
    render(<GoalsPage />);

    const card = await screen.findByRole('article', { name: 'Learn ASP.NET Core' });

    expect(await within(card).findByText('0 / 20 pomodoro · %0')).toBeInTheDocument();
  });
});
