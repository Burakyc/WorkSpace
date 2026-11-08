import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TopicSummary } from '../../shared/api/types';
import { fakeTopic, installFakeContentApi } from '../content/testing/fakeContentApi';
import { LANGUAGE_KEY, LessonPlanPanel } from './LessonPlanPanel';

const lessonSummary: TopicSummary = {
  slug: 'di',
  topic: 'DI',
  level: 'advanced',
  tags: [],
  itemCount: 2,
  marks: {},
  updatedAt: '2026-11-06T09:00:00Z',
};

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Answers GET /api/settings on top of the fake content API. */
function installApi(focusMinutes: number | null, aiMode = 'copyPaste') {
  const fake = installFakeContentApi({
    topics: [
      fakeTopic({ type: 'lesson', slug: 'di', topic: 'DI', level: 'advanced' }, [
        { title: 'Why DI', summary: 's', body: 'b' },
        { title: 'Lifetimes', summary: 's', body: 'b' },
      ]),
    ],
  });
  const content = fake.fetchFn.getMockImplementation();
  fake.fetchFn.mockImplementation((url, init) => {
    if (!String(url).endsWith('/api/settings')) return content!(url, init);
    return Promise.resolve(
      focusMinutes === null
        ? new Response('{}', { status: 500 })
        : Response.json({ pomodoro: { focusMinutes }, aiModes: { learning: aiMode } }),
    );
  });
}

const buildButton = () => screen.getByRole('button', { name: 'Promptu oluştur' });

async function copied(): Promise<string> {
  fireEvent.click(buildButton());
  fireEvent.click(await screen.findByRole('button', { name: 'Promptu kopyala' }));
  await screen.findByText('Kopyalandı.');
  return String(writeText.mock.calls[0]?.[0]);
}

function renderPanel(topics: TopicSummary[] = []) {
  return render(<LessonPlanPanel topics={topics} onImported={() => undefined} />);
}

describe('LessonPlanPanel', () => {
  it('needs a topic, then copies the answers and the focus length', async () => {
    installApi(40);
    renderPanel();

    expect(buildButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });
    fireEvent.change(screen.getByLabelText('Seviye'), { target: { value: 'intermediate' } });
    fireEvent.change(screen.getByLabelText('Parça sayısı (isteğe bağlı)'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Bildiklerim / hedefim (isteğe bağlı)'), {
      target: { value: 'C# biliyorum' },
    });

    const prompt = await copied();
    expect(prompt).toContain('Topic: Generics');
    expect(prompt).toContain('Level: intermediate');
    expect(prompt).toContain('Language: English');
    expect(prompt).toContain('Number of parts: 4');
    expect(prompt).toContain('C# biliyorum');
    expect(prompt).toContain('one 40-minute pomodoro');
  });

  it('uses the default focus length when the settings fail', async () => {
    installApi(null);
    renderPanel();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });

    expect(await copied()).toContain('one 25-minute pomodoro');
  });

  it.each(['0', '51', '2.5'])('refuses %s parts', (value) => {
    installApi(25);
    renderPanel();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });
    fireEvent.change(screen.getByLabelText('Parça sayısı (isteğe bağlı)'), { target: { value } });

    expect(screen.getByText('1 ile 50 arasında olmalı.')).toBeInTheDocument();
    expect(buildButton()).toBeDisabled();
  });

  it('remembers the language', async () => {
    installApi(25);
    const { unmount } = renderPanel();
    fireEvent.change(screen.getByLabelText('İçerik dili'), { target: { value: 'tr' } });
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('tr');
    unmount();

    renderPanel();
    expect(screen.getByLabelText('İçerik dili')).toHaveValue('tr');
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });
    expect(await copied()).toContain('Language: Turkish');
  });

  it('continues an existing lesson at its level, listing its parts', async () => {
    installApi(25);
    renderPanel([lessonSummary]);
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: ' DI ' } });

    expect(screen.getByText(/Bu ders zaten var/)).toBeInTheDocument();
    expect(screen.getByLabelText('Seviye')).toBeDisabled();
    expect(screen.getByLabelText('Seviye')).toHaveValue('advanced');

    const prompt = await copied();
    expect(prompt).toContain('Level: advanced');
    expect(prompt).toContain('- Why DI\n- Lifetimes');
  });

  it('says so when the lesson to continue cannot be read', async () => {
    installApi(25);
    renderPanel([{ ...lessonSummary, slug: 'gone' }]);
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'DI' } });
    fireEvent.click(buildButton());

    expect(await screen.findByText('Prompt oluşturulamadı.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Promptu kopyala' })).not.toBeInTheDocument();
  });

  it('runs the built prompt through the API mode, without calling on its own', async () => {
    installApi(30, 'api');
    renderPanel();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });
    fireEvent.click(buildButton());

    const prompt = await screen.findByLabelText('Prompt');
    expect((prompt as HTMLTextAreaElement).value).toContain('Topic: Generics');
    expect((prompt as HTMLTextAreaElement).value).toContain('one 30-minute pomodoro');
    expect(screen.getByRole('button', { name: 'Yapay zekâya gönder' })).toBeDisabled();
  });

  it('hides the prompt when the form changes', async () => {
    installApi(25);
    renderPanel();
    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Generics' } });
    fireEvent.click(buildButton());
    await screen.findByRole('button', { name: 'Promptu kopyala' });

    fireEvent.change(screen.getByLabelText('Konu'), { target: { value: 'Async' } });

    expect(screen.queryByRole('button', { name: 'Promptu kopyala' })).not.toBeInTheDocument();
    expect(screen.getByText('Form değişti; promptu yeniden oluştur.')).toBeInTheDocument();
  });
});
