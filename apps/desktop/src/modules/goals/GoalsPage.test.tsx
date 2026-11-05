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
  return cards.map((card) => within(card).getByRole('heading').textContent);
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
