import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedItem, YouTubeVideo } from '../../shared/api/types';
import { DEFAULT_POMODORO_SETTINGS } from '../../shared/api/types';
import { todayLocal } from '../calendar/monthGrid';
import { goal, installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { PomodoroProvider, STORAGE_KEY } from '../pomodoro/PomodoroContext';
import { HomePage } from './HomePage';

const aspnet = goal({ id: 'a', title: 'Learn ASP.NET Core', targetPomodoros: 20 });
const english = goal({ id: 'b', title: 'English every day' });
const old = goal({ id: 'c', title: 'Old goal', archived: true });

function renderPage() {
  return render(
    <MemoryRouter>
      <PomodoroProvider>
        <HomePage />
      </PomodoroProvider>
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage today card', () => {
  it("shows today's pomodoros and the active goals with progress", async () => {
    installFakeGoalsApi([aspnet, english, old], {
      progress: [{ goalId: 'a', completedSessions: 7, totalMinutes: 175, percent: 35 }],
      days: {
        [todayLocal()]: { completedSessions: 2, totalMinutes: 50, sessions: [], goals: [] },
      },
    });

    renderPage();

    const today = card('Bugün');
    expect(await within(today).findByText('Bugün 2 pomodoro · 50 dk')).toBeInTheDocument();
    const goals = within(today).getByRole('list', { name: 'Aktif hedefler' });
    expect(within(goals).getByText('Learn ASP.NET Core')).toBeInTheDocument();
    expect(within(goals).getByText('7 / 20 pomodoro · %35')).toBeInTheDocument();
    expect(within(goals).getByText('0 pomodoro · 0 dk')).toBeInTheDocument();
    expect(within(today).queryByText('Old goal')).not.toBeInTheDocument();
  });

  it('starts a focus timer for the picked goal in two clicks', async () => {
    installFakeGoalsApi([aspnet, english], {
      settings: { ...DEFAULT_POMODORO_SETTINGS, focusMinutes: 50 },
    });
    renderPage();

    const today = card('Bugün');
    const start = await within(today).findByRole('button', { name: 'Başlat' });
    expect(start).toBeDisabled();
    fireEvent.change(within(today).getByLabelText('Hedef'), { target: { value: 'b' } });
    fireEvent.click(start);

    expect(within(today).getByText(/Pomodoro sürüyor\./)).toBeInTheDocument();
    expect(within(today).getByRole('link', { name: "Pomodoro'ya git" })).toHaveAttribute(
      'href',
      '/pomodoro',
    );
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      status: string;
      goalId: string;
      startedAt: number;
      endsAt: number;
    };
    expect(stored.status).toBe('running');
    expect(stored.goalId).toBe('b');
    expect(stored.endsAt - stored.startedAt).toBe(50 * 60_000);
  });

  it('links to the goals page when there are no goals', async () => {
    installFakeGoalsApi([]);
    renderPage();

    const today = card('Bugün');
    expect(await within(today).findByRole('link', { name: 'Hedeflere git' })).toHaveAttribute(
      'href',
      '/goals',
    );
    expect(within(today).queryByRole('button', { name: 'Başlat' })).not.toBeInTheDocument();
  });

  it('shows an error inside the card when today cannot be loaded', async () => {
    installFakeGoalsApi([aspnet], { failDays: true });
    renderPage();

    expect(
      await within(card('Bugün')).findByText('Bugünün özeti yüklenemedi.'),
    ).toBeInTheDocument();
  });
});

const feedItem = (title: string, extra: Partial<FeedItem> = {}): FeedItem => ({
  title,
  summary: `${title} özeti`,
  url: null,
  source: null,
  publishedAt: null,
  ...extra,
});

describe('HomePage feed card', () => {
  it('lists the summaries and opens a link in the browser', async () => {
    const api = installFakeGoalsApi([], {
      feed: {
        status: 'ok',
        generatedAt: '2026-11-06T07:00:00Z',
        items: [
          feedItem('.NET 10 çıktı', {
            url: 'https://x.com/dotnet/1',
            source: 'dotnet',
            publishedAt: '2026-11-05T20:00:00Z',
          }),
          feedItem('Linksiz özet'),
        ],
        errors: [],
      },
    });
    renderPage();

    const feed = card('Akış');
    const list = await within(feed).findByRole('list', { name: 'Özetler' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('.NET 10 çıktı özeti')).toBeInTheDocument();
    expect(within(list).getByText(/^dotnet · /)).toBeInTheDocument();
    expect(within(feed).getByText(/^Güncellendi: /)).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Aç: .NET 10 çıktı' }));
    expect(api.openExternal).toHaveBeenCalledWith('https://x.com/dotnet/1');
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });

  it.each([
    [
      'missing',
      { status: 'missing', generatedAt: null, items: [], errors: [] },
      'Akış dosyası bulunamadı.',
    ],
    [
      'empty',
      { status: 'ok', generatedAt: '2026-11-06T07:00:00Z', items: [], errors: [] },
      'Akışta özet yok.',
    ],
  ] as const)('shows the %s state', async (_name, feed, text) => {
    installFakeGoalsApi([], { feed: { ...feed, items: [], errors: [] } });
    renderPage();

    expect(await within(card('Akış')).findByText(text)).toBeInTheDocument();
  });

  it('shows the error lines of an invalid file', async () => {
    installFakeGoalsApi([], {
      feed: {
        status: 'invalid',
        generatedAt: null,
        items: [],
        errors: ['items[0].title: Başlık gerekli.', 'schemaVersion: 1 olmalı.'],
      },
    });
    renderPage();

    const feed = card('Akış');
    expect(await within(feed).findByText('Akış dosyası geçersiz.')).toBeInTheDocument();
    expect(
      within(within(feed).getByRole('list', { name: 'Hatalar' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['items[0].title: Başlık gerekli.', 'schemaVersion: 1 olmalı.']);
  });

  it('shows an error card when the request fails, and the other cards still work', async () => {
    installFakeGoalsApi([aspnet], { failFeed: true });
    renderPage();

    expect(await within(card('Akış')).findByText('Akış yüklenemedi.')).toBeInTheDocument();
    expect(await within(card('Bugün')).findByText('Bugün 0 pomodoro · 0 dk')).toBeInTheDocument();
  });
});

describe('HomePage reminders card', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows today's reminders with their status", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 12, 30));
    installFakeGoalsApi([]);
    renderPage();

    const rows = within(card('Hatırlatmalar'))
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(rows).toEqual(['09:00 İngilizcegeçti', '20:00 Tekniksıradaki']);
  });
});

const video = (id: string, title: string, publishedAt: string): YouTubeVideo => ({
  id,
  title,
  channelId: 'UC1',
  channelTitle: 'Google for Developers',
  publishedAt,
  thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  url: `https://www.youtube.com/watch?v=${id}`,
});
const channel = { id: 'UC1', title: 'Google for Developers' };
const cached = {
  videos: [video('aaaaaaaaaaa', 'Yeni video', '2026-11-05T17:00:00Z')],
  lastRefreshAt: '2026-11-06T06:00:00Z',
  error: null,
};

describe('HomePage videos card', () => {
  it('lists the videos and opens one in the browser', async () => {
    const api = installFakeGoalsApi([], { youTubeChannels: [channel], youTubeVideos: cached });
    renderPage();

    const list = await within(card('Yeni videolar')).findByRole('list', { name: 'Videolar' });
    const item = within(list).getByRole('listitem');
    expect(item.querySelector('img')).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg',
    );
    expect(within(item).getByText(/^Google for Developers · 5 Kasım 2026$/)).toBeInTheDocument();

    fireEvent.click(within(item).getByRole('button', { name: 'Yeni video' }));
    expect(api.openExternal).toHaveBeenCalledWith('https://www.youtube.com/watch?v=aaaaaaaaaaa');
  });

  it('shows the refresh error together with the cached list', async () => {
    installFakeGoalsApi([], {
      youTubeChannels: [channel],
      youTubeVideos: { ...cached, error: 'Güncellenemeyen kanallar: Google for Developers.' },
    });
    renderPage();

    const videos = card('Yeni videolar');
    expect(
      await within(videos).findByText('Güncellenemeyen kanallar: Google for Developers.'),
    ).toBeInTheDocument();
    expect(within(videos).getByRole('button', { name: 'Yeni video' })).toBeInTheDocument();
  });

  it('refreshes with "Yenile" and keeps the list when the refresh fails', async () => {
    installFakeGoalsApi([], {
      youTubeChannels: [channel],
      youTubeVideos: cached,
      refreshedVideos: {
        ...cached,
        videos: [video('bbbbbbbbbbb', 'Daha yeni', '2026-11-06T08:00:00Z')],
      },
    });
    renderPage();
    const videos = card('Yeni videolar');

    fireEvent.click(await within(videos).findByRole('button', { name: 'Yenile' }));

    expect(await within(videos).findByRole('button', { name: 'Daha yeni' })).toBeInTheDocument();
  });

  it('says when a refresh fails', async () => {
    installFakeGoalsApi([], {
      youTubeChannels: [channel],
      youTubeVideos: cached,
      failRefresh: true,
    });
    renderPage();
    const videos = card('Yeni videolar');

    fireEvent.click(await within(videos).findByRole('button', { name: 'Yenile' }));

    expect(await within(videos).findByText('Videolar yenilenemedi.')).toBeInTheDocument();
    expect(within(videos).getByRole('button', { name: 'Yeni video' })).toBeInTheDocument();
  });

  it('points to Ayarlar without channels and says when nothing was fetched yet', async () => {
    installFakeGoalsApi([]);
    const first = renderPage();
    expect(
      await within(card('Yeni videolar')).findByRole('link', { name: "Ayarlar'dan kanal ekle" }),
    ).toHaveAttribute('href', '/settings');
    first.unmount();

    installFakeGoalsApi([], { youTubeChannels: [channel] });
    renderPage();
    expect(
      await within(card('Yeni videolar')).findByText('Videolar henüz çekilmedi.'),
    ).toBeInTheDocument();
  });
});

const gitHub = {
  stats: {
    stars: 12,
    followers: 5,
    publicRepos: 9,
    commitsLast30Days: 41,
    recentCommits: [
      {
        repo: 'octo/app',
        sha: 'abc',
        message: 'fix: first line',
        date: '2026-11-05T10:00:00Z',
        url: 'https://github.com/octo/app/commit/abc',
      },
      {
        repo: 'octo/lib',
        sha: 'def',
        message: 'feat: no link',
        date: '2026-11-04T10:00:00Z',
        url: null,
      },
    ],
  },
  fetchedAt: '2026-11-06T06:00:00Z',
  lastRefreshAt: '2026-11-06T06:00:00Z',
  error: null,
};

describe('HomePage GitHub card', () => {
  it('shows the numbers and opens a commit', async () => {
    const api = installFakeGoalsApi([], { gitHubUsername: 'octo', gitHub });
    renderPage();

    const github = card('GitHub');
    expect(await within(github).findByText('Son 30 günde 41 commit')).toBeInTheDocument();
    expect(within(github).getByText('Yıldız').nextSibling).toHaveTextContent('12');
    expect(within(github).getByText('Takipçi').nextSibling).toHaveTextContent('5');
    expect(within(github).getByText('Public repo').nextSibling).toHaveTextContent('9');

    fireEvent.click(within(github).getByRole('button', { name: 'fix: first line' }));
    expect(api.openExternal).toHaveBeenCalledWith('https://github.com/octo/app/commit/abc');
    expect(within(github).queryByRole('button', { name: 'feat: no link' })).not.toBeInTheDocument();
  });

  it('shows the error together with the cached numbers, and refreshes', async () => {
    installFakeGoalsApi([], {
      gitHubUsername: 'octo',
      gitHub: { ...gitHub, error: "GitHub'a ulaşılamadı." },
      refreshedGitHub: { ...gitHub, stats: { ...gitHub.stats, commitsLast30Days: 42 } },
    });
    renderPage();

    const github = card('GitHub');
    expect(await within(github).findByText("GitHub'a ulaşılamadı.")).toBeInTheDocument();
    expect(within(github).getByText('Son 30 günde 41 commit')).toBeInTheDocument();

    fireEvent.click(within(github).getByRole('button', { name: 'Yenile' }));
    expect(await within(github).findByText('Son 30 günde 42 commit')).toBeInTheDocument();
    expect(within(github).queryByText("GitHub'a ulaşılamadı.")).not.toBeInTheDocument();
  });

  it('points to Ayarlar without a username', async () => {
    installFakeGoalsApi([]);
    renderPage();

    expect(
      await within(card('GitHub')).findByRole('link', { name: "Ayarlar'dan gir" }),
    ).toHaveAttribute('href', '/settings');
  });
});

describe('HomePage changes card', () => {
  it('shows what changed and the streak', async () => {
    installFakeGoalsApi([], {
      visit: {
        since: '2026-11-05T18:00:00Z',
        newStars: 2,
        newFollowers: -1,
        newVideos: 3,
        streakDays: 4,
      },
    });
    renderPage();

    const changes = card('Son ziyaretinden beri');
    const rows = await within(changes).findAllByRole('listitem');
    expect(rows.map((li) => li.textContent)).toEqual([
      'Yeni yıldız+2',
      'Yeni takipçi−1',
      'Yeni video3',
      'Pomodoro serisi4 gün',
    ]);
    expect(within(changes).queryByText(/İlk açılış/)).not.toBeInTheDocument();
  });

  it('says it is the first visit and invites a pomodoro without a streak', async () => {
    installFakeGoalsApi([]);
    renderPage();

    const changes = card('Son ziyaretinden beri');
    expect(await within(changes).findByText(/^İlk açılış/)).toBeInTheDocument();
    expect(within(changes).getAllByRole('listitem')).toHaveLength(1);
    expect(within(changes).getByText('Bugün bir pomodoro ile başla.')).toBeInTheDocument();
  });

  it('shows an error when the visit cannot be recorded, and the other cards still work', async () => {
    installFakeGoalsApi([], { failVisit: true });
    renderPage();

    expect(
      await within(card('Son ziyaretinden beri')).findByText('Değişiklikler yüklenemedi.'),
    ).toBeInTheDocument();
    expect(await within(card('Bugün')).findByText('Bugün 0 pomodoro · 0 dk')).toBeInTheDocument();
  });
});
